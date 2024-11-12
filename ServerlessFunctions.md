# Serverless Functions: Construct Advanced Transactions Without a Smart Contract

## Introduction

Have you ever had a cool idea for a dApp, but were too worried about creating a smart contract to build it? Believe it or not, on Solana you do NOT need a smart contract to build something safe and complex!

So if you want something that "just works", and aren't concerned about the optics of introducing an off-chain backend to your dApp, this is the guide for you!

## Overview

1. Building and serializing a server-side transaction with a backend signer.
2. Deserialzing and signing the transaction on the front-end.

For the purpose of this guide, we will be building an app that sells SPL tokens to a user at a fixed rate from a backend wallet.

## Serverless Function Provider

You can use any backend provider; it doesn't even have to be a serverless function! 

I recommend [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/) for small to medium traffic projects. These platforms make it easy to build serverless functions while remaining relatively affordable. However, if you start hitting Vercel's limits, be aware that going over can get pretty expensive!

You can check out [this example as a full Next.js dApp on GitHub](https://github.com/potatoe-dev/serverless-function-example).

## Creating, Signing, and Serializing Backend Transactions

The first step to this process is to build the transaction on the backend!

In our example, we want to sell the user SPL tokens for Solana. So we need a transaction that:

1. Sends Solana from the user to our backend wallet
2. Sends SPL tokens from our backend wallet to the user

The key to this process is having a backend private key sign for your backend wallet. So we will start with a user wallet and a backend signer.

```javascript
//User wallet as a publickey
let userWallet = new anchor.web3.PublicKey(userWalletString)

//Setup backend signer
let backendSecret = process.env.NEXT_PUBLIC_SECRET!
const backendSigner = anchor.web3.Keypair.fromSecretKey(bs58.decode(backendSecret))

//Create initial transaction
const transaction = new anchor.web3.Transaction();
```

Now we can start building our transaction! In our example we will have a static price of 0.001 SOL. But the beauty of this technique is that you can use any off-chain logic you want when building your transaction.

Maybe make your price dependent on the day of the week, or maybe make the price cheaper for wallets in a whitelist. The power is yours!

```javascript
//transfer 0.001 SOL from the user to the backend wallet instruction
const solTransferInstruction = anchor.web3.SystemProgram.transfer({
    fromPubkey: userWallet,
    toPubkey: backendSigner.publicKey,
    lamports: 1000000
})

//add solTransferInstruction
transaction.add(solTransferInstruction)
```

Then we add an instruction to send token from the backend wallet to the user.

Again, since we are now building these from a secure backend, you can make this as creative and complex as you want. Maybe you want to send 2 tokens to the user. Maybe you want to send an NFT in some cases. This setup lets you achieve very complex actions, without a smart contract!

```javascript
//transfer 10 tokens from the backend wallet to the user
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
```

We will skip over some token account management and optimal priority fee management, but you should get the general idea of how we put together this transaction.

Now we will sign with our backend signer, serialize the transaction, and send it to the front-end for signing by our user. 

*Note that we have requireAllSignatures set to false when serializing.*

```javascript
//Partial Sign with the backend signer
transaction.partialSign(backendSigner);

//Return serialized transaction
return NextResponse.json(
    {
        serializedTransaction: transaction.serialize({ requireAllSignatures: false }),
    }, 
    { 
        status: 200 
    }
);
```

## Deserializing, Front-End Signing, and Sending

Now that the backend has done all the heavy lifting, the front-end simply needs to deserialize the transaction and sign it!

First we call the serverless function.

```javascript
//Call the serverless function
const res = await axios
.post('/api/purchase_token', {
        userWalletString: publicKey!.toString()
    }).then((response) => response.data)
```

Now that we have the serialized transaction, we simply deserialize it and have the user sign/send the transaction.

```javascript
//Deserialize the transaction
let transaction = anchor.web3.Transaction.from(Buffer.from(res.serializedTransaction, 'base64'));

//Ask the user to sign/send the transaction
let sig = await sendTransaction!(transaction, connection,)
```

And there we go! You have now successfully put together some cool Solana transactions without a smart contract!

## Is this Safe?

This method is safe if used properly, however always be on your toes for security risks to your design.

Since you are creating and signing the transaction on the backend, people cannot change it once it reaches the front-end. That means your biggest vaulnerability is in bugs you introduce to your backend. 

Here is one quick example, lets say you want to base the price of this swap on a JUP API. Unfortunatly, one day the API doesn't return because of congestion and you accidently set the price of your token to 0 on the backend. This would mean people are getting free tokens!

## Conclusion

Now that you can create cool transactions without a smart contract, go build something crazy!