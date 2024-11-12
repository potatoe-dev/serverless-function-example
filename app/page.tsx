'use client'
import dynamic from 'next/dynamic';
import * as anchor from "@project-serum/anchor";
import axios from 'axios'
import { useWallet } from '@solana/wallet-adapter-react'

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function HomePage() {
    const { publicKey, sendTransaction } = useWallet()

    const executeSale = async () => {
        try {

            //Helius RPC (update your environment variables!)
            const heliusEndpoint = process.env.NEXT_PUBLIC_RPC_FRONT_END!

            //Initiate Solana Connection, Replace with your own Helius RPC
            const connection = new anchor.web3.Connection(heliusEndpoint, "confirmed");

            //Call the serverless function
            const res = await axios
                .post('/api/purchase_token', {
                    userWalletString: publicKey!.toString()
                })
                .then((response) => response.data)

            //Deserialize the transaction
            let transaction = anchor.web3.Transaction.from(Buffer.from(res.serializedTransaction, 'base64'));
            //Ask the user to sign/send the transaction
            let sig = await sendTransaction!(transaction, connection,)
      
            alert("Purchased!")

        } catch (e) {
            console.log(e)
        }
    }

    return (
        <>
            <div className='flex mb-4 mt-4 justify-center'>
                <WalletMultiButtonDynamic />
            </div>
            <div className='flex mb-4 justify-center'>
                {
                    publicKey ? <button onClick={executeSale} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"> Buy </button> : <></>
                }
            </div>
        </>
    )
}
