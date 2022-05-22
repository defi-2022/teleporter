import Head from 'next/head'
import { useEffect, useState, useRef } from 'react'
import { BigNumberish, BigNumber, ethers, providers, Wallet } from 'ethers'
import { formatEther, parseEther, parseUnits, formatUnits } from 'ethers/lib/utils'
const { getL2Network, Erc20Bridger, L1ToL2MessageStatus, L1TransactionReceipt } = require('@arbitrum/sdk')

const chains = {
  'arbitrum-testnet': {
    chainId: 421611,
    chainIdHex: '0x66EEB',
    relayAddress: '0xef4dF54E711e0d42754a12e85fD4186f8fF2c7A7',
    contractAddress: '0x78e59654Bc33dBbFf9FfF83703743566B1a0eA15',
    etherscan: 'https://testnet.arbiscan.io/tx/',
    dest: ['rinkeby'],
    rpc: 'https://rinkeby.arbitrum.io/rpc',
    name: 'Arbitrum Testnet',
    id: 'arbitrum-testnet',
  },
  'optimism-testnet': {
    chainId: 69,
    chainIdHex: '0x45',
    relayAddress: '0xAAFa36901AdC6C03df8B935fFA129677D1D7Eb81',
    contractAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    etherscan: 'https://kovan-optimistic.etherscan.io/tx/',
    dest: ['kovan'],
    rpc: 'https://kovan.optimism.io/',
    name: 'Optimism Testnet',
    id: 'optimism-testnet',
  },
  rinkeby: {
    chainId: 4,
    chainIdHex: '0x4',
    relayAddress: '',
    contractAddress: '0x17B729a6Ac1f265090cbb4AecBdd53E34664C00e',
    etherscan: 'https://rinkeby.etherscan.io/tx/',
    dest: [],
    rpc: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    name: 'Rinkeby Testnet',
    id: 'rinkeby',
  },
  kovan: {
    chainId: 42,
    chainIdHex: '0x2A',
    relayAddress: '',
    contractAddress: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
    etherscan: 'https://kovan.etherscan.io/tx/',
    dest: [],
    rpc: 'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    name: 'Kovan Testnet',
    id: 'kovan',
  },
}

const Toast = (props) => {
  return (
    <div>
      {props.text}{' '}
      {props.link && (
        <a href={props.link} target="_blank" className="underline text-blue-600 hover:text-blue-800">
          View on block explorer
        </a>
      )}
    </div>
  )
}

const allowedSourceChains = ['arbitrum-testnet', 'optimism-testnet']

const sourceChains = Object.keys(chains)
  .filter((key) => allowedSourceChains.includes(key))
  .reduce((obj, key) => {
    obj.push(chains[key])
    return obj
  }, [])

import { getAmountsForWormholeGUID, getAttestations, initRelayedWormhole, relayMintWithOracles } from '../src/index'
import Modal from '../components/Modal'
import useClickOutside from '../hooks/useClickOutside'

const erc20abi = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
]

export default function Home() {
  const [srcBalance, setSrcBalance] = useState(0)
  const [destBalance, setDestBalance] = useState(0)
  const [address, setAddress] = useState()
  const [modal, setModal] = useState(false)
  const [isSourceModal, setIsSourceModal] = useState(false)
  const [srcChain, setSrcChain] = useState(null)
  const [destChain, setDestChain] = useState(null)
  const [amount, setAmount] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [gasPrice, setGasPrice] = useState(0)
  const [toastText, setToastText] = useState()
  const [notifications, setNotifications] = useState([])
  const modalRef = useRef()

  useClickOutside(modalRef, () => setModal(false))

  useEffect(() => {
    ;(async () => {
      if (srcChain) {
        const provider = new ethers.providers.JsonRpcProvider(chains[srcChain].rpc)
        let gasPriceTemp = await provider.getGasPrice()
        gasPriceTemp = formatUnits(gasPriceTemp, 'gwei')
        const contract = new ethers.Contract(chains[srcChain].contractAddress, erc20abi, provider)
        const balance = await contract.balanceOf('0x592f326f977c156de50b3e809fba5f2a837bc956')
        console.log(balance)
        setSrcBalance(balance)
        setGasPrice(gasPriceTemp)
      }
    })()
  }, [srcChain])

  useEffect(() => {
    ;(async () => {
      if (destChain) {
        const provider = new ethers.providers.JsonRpcProvider(chains[destChain].rpc)
        const contract = new ethers.Contract(chains[destChain].contractAddress, erc20abi, provider)
        const balance = await contract.balanceOf('0x592f326f977c156de50b3e809fba5f2a837bc956')
        setDestBalance(balance)
      }
    })()
  }, [destChain])

  useEffect(() => {
    if (toastText) {
      const tempNotifications = notifications.map((notification) => {
        return {
          ...notification,
          loading: false,
        }
      })
      const newNotifications = [toastText, ...tempNotifications]
      setNotifications(newNotifications)
    }
  }, [toastText])

  const destChainOptions = srcChain
    ? chains[srcChain].dest.reduce((arr, key) => {
        arr.push(chains[key])
        return arr
      }, [])
    : chains


  async function connect() {
    //client side code
    if (!window.ethereum) return

    const provider = new ethers.providers.Web3Provider(window.ethereum)

    await provider.send('eth_requestAccounts', [])
    const signer = provider.getSigner()
    setAddress(await signer.getAddress())
  }

  async function bridge() {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    setToastText({ text: 'Bridge initiated', loading: true })

    let initTx = await initRelayedWormhole({
      srcDomain: srcChain,
      srcDomainProvider: provider,
      sender: signer,
      receiverAddress: address,
      amount: parseUnits(amount),
      relayAddress: chains[srcChain].relayAddress,
    })
    setToastText({ text: 'Burn tx submitted:', link: `${chains[srcChain].etherscan}${initTx.tx.hash}`, loading: false })
    console.log(`Burn tx submitted: ${chains[srcChain].etherscan}${initTx.tx.hash}`)

    const { signatures, wormholeGUID } = await getAttestations({
      txHash: initTx.tx.hash,
      srcDomain: srcChain,
      newSignatureReceivedCallback: (numSigs, threshold) => {
        setToastText({ text: `Waiting for attestations: received ${numSigs}/${threshold} signatures`, loading: true })
        console.log(`Signatures received: ${numSigs} (required: ${threshold}).`)
      },
    })
    setToastText({ text: 'Attestations received', loading: false })

    const { mintable, pending, bridgeFee, relayFee } = await getAmountsForWormholeGUID({
      srcDomain: srcChain,
      wormholeGUID: wormholeGUID,
      relayAddress: chains[srcChain].relayAddress,
    })

    const WAD = parseEther('1.0')
    const maxFeePercentage = bridgeFee.mul(WAD).div(mintable)

    console.log(`\nRelaying minting of ${formatEther(mintable)} DAI on ${chains[destChain].name}`)
    setToastText({
      text: `Relaying minting of ${formatEther(mintable)} DAI on ${chains[destChain].name}`,
      loading: true,
    })
    const mintTxHash = await relayMintWithOracles({
      receiver: signer,
      srcDomain: srcChain,
      wormholeGUID: wormholeGUID,
      signatures,
      maxFeePercentage,
      relayFee,
      relayAddress: chains[srcChain].relayAddress,
    })

    console.log(`Relayed minting tx submitted: ${chains[destChain].etherscan}${mintTxHash}`)
    setToastText({
      text: 'Relayed minting tx submitted:',
      link: `${chains[destChain].etherscan}${mintTxHash}`,
      loading: false,
    })
    //const dstProvider = new providers.JsonRpcProvider(DEFAULT_RPC_URLS[getDefaultDstDomain(srcDomain)])
    const dstProvider = new providers.JsonRpcProvider(chains[destChain].rpc)
    await dstProvider.getTransactionReceipt(mintTxHash)
  }

  const addShortenedString =
    address && address.substring(0, 5) + '...' + address.substring(address.length - 4, address.length)

  return (
    <div className="flex flex-col h-screen bg-purple-100">
      <Head>
        <title>DAI Teleporter</title>
      </Head>
      <div className="flex-initial">
        <div className="flex w-full flex-wrap justify-between">
          <div className="flex items-center justify-center text-xl font-semibold px-2 m-2 text-center">
            DAI Teleporter
          </div>
          <div className="flex px-2 m-2 justify-center">
            <button
              className="rounded-xl text-gray-400 bg-gray-800 hover:bg-gray-600 px-1 py-2 outline-none focus:outline-none"
              onClick={!address ? connect : undefined}
            >
              {address ? addShortenedString : 'Connect'}
            </button>
          </div>
        </div>
        {modal && (
          <Modal
            modalRef={modalRef}
            options={isSourceModal ? sourceChains : destChainOptions}
            sourceChain={isSourceModal}
            callback={async (chainName) => {
              setModal(false)
              if (isSourceModal) {
                setSrcChain(chainName)

                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: chains[chainName].chainIdHex }],
                })
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                let gasPriceTemp = await provider.getGasPrice()
                gasPriceTemp = formatUnits(gasPriceTemp, 'gwei')
                setGasPrice(gasPriceTemp)
              } else {
                setDestChain(chainName)
              }
            }}
          />
        )}
      </div>

      <div className="flex justify-center h-full pt-10">
        <div className="bg-white h-2/5 sm:max-w-lg sm:w-full flex flex-col flex-shrink rounded-2xl border border-gray-300">
          <div className="flex flex-row justify-between p-7">
            <div className="flex flex-col mx-2 w-1/2">
              <div className="flex flex-row justify-start">Source chain:</div>
              <div
                className="flex justify-center my-2 p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 border-gray-300 cursor-pointer"
                onClick={() => {
                  setModal(!modal)
                  setIsSourceModal(true)
                }}
              >
                {srcChain ? chains[srcChain].name : 'Source chain'}
              </div>
              {srcChain && <div className="flex flex-row justify-start text-xs text-gray-600">Gas: {gasPrice}</div>}
              {srcChain && (
                <div className="flex flex-row justify-start text-xs text-gray-600">
                  Balance: {formatEther(srcBalance.toString())}
                </div>
              )}
            </div>
            <div className="flex flex-col mx-2 w-1/2">
              <div className="flex flex-row justify-start">Destination chain:</div>
              <div
                className="flex justify-center my-2 p-1.5 hover:bg-gray-100 rounded-lg border text-gray-600 border-gray-300 cursor-pointer"
                onClick={() => {
                  setModal(!modal)
                  setIsSourceModal(false)
                }}
              >
                {destChain ? chains[destChain].name : 'Destination chain'}
              </div>
              {destChain && (
                <div className="flex flex-row justify-start text-xs text-gray-600">
                  Balance: {formatEther(destBalance.toString())}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-row w-full justify-center px-9">
            <div className="flex">Amount:</div>
            <div className="flex w-full justify-end">
              <input
                className="border border-gray-300 rounded-lg p-1.5 text-right"
                placeholder="0.00"
                pattern="[0-9]*"
                onKeyPress={(event) => {
                  if (!/[\d.]$/.test(event.key)) {
                    event.preventDefault()
                  }
                }}
                onChange={(e) => {
                  setAmount(e.target.value)
                }}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button className="p-2 mt-4 bg-purple-200 rounded-lg" onClick={bridge}>
              Bridge
            </button>
          </div>
        </div>
      </div>
      {notifications.length > 0 && (
        <div className="absolute flex flex-col w-full h-full justify-end items-end">
          {notifications.map((notification) => (
            <div
              className="flex items-center w-full max-w-xs p-4 mb-6 mx-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800"
              role="alert"
            >
              {notification.loading ? (
                <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                      s
                    ></path>
                  </svg>
                </div>
              )}

              <div className="ml-3 text-sm font-normal">
                <Toast {...notification} />
              </div>
              <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                aria-label="Close"
                onClick={() => {
                  const tempNotifications = notifications.filter((n) => n !== notification)
                  // const index = notifications.indexOf(notification);
                  // const newNotifications = notifications.splice(index, 1)
                  console.log(notifications)
                  console.log(tempNotifications)
                  setNotifications(tempNotifications)
                }}
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
