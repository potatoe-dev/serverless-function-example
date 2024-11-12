import * as anchor from "@project-serum/anchor";
import * as bs58 from "bs58";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction
} from "@solana/spl-token";

import { NextResponse } from "next/server";

export async function POST(request: any) {

  //Post Request Variables
  const {
    userWalletString
  } = await request.json();

  try {

    //Helius RPC (update your environment variables!)
    const heliusEndpoint = process.env.NEXT_PUBLIC_RPC!

    //Initiate Solana Connection, Replace with your own Helius RPC
    const connection = new anchor.web3.Connection(heliusEndpoint, "confirmed");

    //User wallet as a publickey
    let userWallet = new anchor.web3.PublicKey(userWalletString)

    //Setup backend signer (update your environment variables!)
    let backendSecret = process.env.NEXT_PUBLIC_SECRET!
    const backendSigner = anchor.web3.Keypair.fromSecretKey(bs58.decode(backendSecret))

    //Token To Sell
    let tokenMint = new anchor.web3.PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
    //Make sure to have the right decimals
    let tokenDecimals = 5

    // Get Token Accounts (source backend wallet, destination user wallet)
    let sourceTokenAccount = await getAssociatedTokenAddress(tokenMint, backendSigner.publicKey)
    let destinationTokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet)

    //check if there is a token account
    let tokenAccountData = await connection.getParsedAccountInfo(destinationTokenAccount)

    //Create initial transaction
    const transaction = new anchor.web3.Transaction();

    //If there is no token account for the user, add that instruction to our transaction
    if (!tokenAccountData.value) {
      //create user token account instruction
      const associatedTokenAccountInstruction = createAssociatedTokenAccountInstruction(
        userWallet,
        destinationTokenAccount,
        userWallet,
        tokenMint
      )
      //add associatedTokenAccountInstruction
      transaction.add(associatedTokenAccountInstruction)
    }

    //transfer 0.001 SOL from the user to the backend wallet instruction
    const solTransferInstruction = anchor.web3.SystemProgram.transfer({
      fromPubkey: userWallet,
      toPubkey: backendSigner.publicKey,
      lamports: 1000000
    })

    //add solTransferInstruction
    transaction.add(solTransferInstruction)

    //transfer tokens from 100000
    let transferTokenInstruction = createTransferCheckedInstruction(
      sourceTokenAccount,
      tokenMint,
      destinationTokenAccount,
      backendSigner.publicKey,
      1000000,
      tokenDecimals
    )

    //add transferTokenInstruction
    transaction.add(transferTokenInstruction)

    //get blockhash
    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight }
    } = await connection.getLatestBlockhashAndContext();

    transaction.recentBlockhash = blockhash
    transaction.feePayer = userWallet

    //Get accountKeys to estimate Priority Fee
    const accountKeys = transaction.compileMessage().accountKeys;
    // Convert PublicKeys to base58 strings
    const publicKeys = accountKeys.map((key: any) => key.toBase58());

    //Get Priority Fee Estimate
    const response = await fetch(heliusEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-example',
        method: 'getPriorityFeeEstimate',
        params: [
          {
            accountKeys: publicKeys,
            options: {
              recommended: true,
            },
          }
        ],
      }),
    });

    const { result } = await response.json();
    const priorityFee = result.priorityFeeEstimate;

    //add priority fee to transaction
    transaction.add(
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee
      })
    );

    //Partial Sign with the backend signer
    transaction.partialSign(backendSigner);

    //Return serialized transaction
    return NextResponse.json(
      {
        serializedTransaction: transaction.serialize({ requireAllSignatures: false }),
      }, { status: 200 });
  
  } catch (e) {
    console.log(e)
    return NextResponse.json({
      "error": "Something went wrong!"
    }, { status: 500 });
  }

}
