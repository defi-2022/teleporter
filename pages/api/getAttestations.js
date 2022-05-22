// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios'
const ORACLE_API_URL = 'http://52.42.179.195:8080'

export default async function handler(req, res) {
  // res.status(200).json({ name: 'John Doe' })
  const response = await axios.get(ORACLE_API_URL, {
    params: {
      type: 'wormhole',
      index: req.query.index,
    },
  })

  console.log(req.query.index)

  // const results = (response.data || [])

  // const wormholes = new Map()
  // for (const oracle of results) {
  //   const h = oracle.data.hash
  //   if (!wormholes.has(h)) {
  //     wormholes.set(h, { signatures: '0x', wormholeGUID: decodeWormholeData(oracle.data.event) })
  //   }
  //   wormholes.get(h).signatures += oracle.signatures.ethereum.signature
  // }
  if(response.data){
    res.status(200).json(response.data)
  }
  else{
    res.status(200).json(null)
  }

  

}

export function decodeWormholeData(wormholeData) {
  const splitData =
    wormholeData
      .replace('0x', '')
      .match(/.{64}/g)
      ?.map((hex) => `0x${hex}`) || []
  const wormholeGUID = {
    sourceDomain: splitData[0],
    targetDomain: splitData[1],
    receiver: splitData[2],
    operator: splitData[3],
    amount: splitData[4],
    nonce: splitData[5],
    timestamp: splitData[6],
  }
  return wormholeGUID
}