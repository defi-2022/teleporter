import { Provider } from '@ethersproject/abstract-provider'
import { providers, Signer } from 'ethers'
import { Dictionary } from 'ts-essentials'

import { getArbitrumTestnetSdk, getKovanSdk, getOptimismKovanSdk, getRinkebySdk } from './sdk'
import {
  BasicRelay,
  Faucet,
  Multicall,
  TrustedRelay,
  Vat,
  WormholeJoin,
  WormholeOracleAuth,
  WormholeOutboundGateway,
} from './sdk/esm/types'

export interface WormholeSdk {
  WormholeOracleAuth?: WormholeOracleAuth
  WormholeJoin?: WormholeJoin
  WormholeOutboundGateway?: WormholeOutboundGateway
  Vat?: Vat
  Multicall?: Multicall
  Faucet?: Faucet
  BasicRelay?: BasicRelay
  TrustedRelay?: TrustedRelay
}

export const DOMAINS = [
  'RINKEBY-SLAVE-ARBITRUM-1',
  'RINKEBY-MASTER-1',
  'KOVAN-SLAVE-OPTIMISM-1',
  'KOVAN-MASTER-1',
  // 'ETHEREUM-SLAVE-OPTIMISM-1',
  // 'ETHEREUM-SLAVE-ARBITRUM-1',
  // 'ETHEREUM-MASTER-1',
] as const

export type DomainId = typeof DOMAINS[number]

export const DEFAULT_RPC_URLS: Dictionary<string, DomainId> = {
  'RINKEBY-SLAVE-ARBITRUM-1': 'https://rinkeby.arbitrum.io/rpc',
  'RINKEBY-MASTER-1': 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'KOVAN-SLAVE-OPTIMISM-1': 'https://kovan.optimism.io/',
  'KOVAN-MASTER-1': 'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  //   "ETHEREUM-SLAVE-OPTIMISM-1": "https://optimism.io/",
  //   "ETHEREUM-SLAVE-ARBITRUM-1": "https://arb1.arbitrum.io/rpc",
  //   "ETHEREUM-MASTER-1": "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
}

export type DomainDescription = DomainId | 'arbitrum-testnet' | 'optimism-testnet' | 'kovan' | 'rinkeby' //| 'arbitrum' | 'optimism'

const descriptionsToDomainIds: Dictionary<DomainId, DomainDescription> = {
  'arbitrum-testnet': 'RINKEBY-SLAVE-ARBITRUM-1',
  'optimism-testnet': 'KOVAN-SLAVE-OPTIMISM-1',
  'kovan' : 'KOVAN-MASTER-1',
  'rinkeby' : 'RINKEBY-MASTER-1',

  ...(Object.assign({}, ...DOMAINS.map((d) => ({ [d]: d }))) as Dictionary<DomainId, DomainId>),
}

export function getLikelyDomainId(srcDomain: DomainDescription): DomainId {
  return descriptionsToDomainIds[srcDomain]
}

export function getDefaultDstDomain(srcDomain: DomainDescription): DomainId {
  const domainId = getLikelyDomainId(srcDomain)
  console.log(domainId)
  if (domainId.includes('OPTIMISM')) {
    return 'KOVAN-MASTER-1'
  }
  if (domainId.includes('ARBITRUM')) {
    return 'RINKEBY-MASTER-1'
  }
  if (domainId.includes('KOVAN')) {
    return 'KOVAN-SLAVE-OPTIMISM-1'
  }
  if (domainId.includes('RINKEBY')) {
    return 'RINKEBY-SLAVE-ARBITRUM-1'
  }
  throw new Error(`No default destination domain for source domain "${srcDomain}"`)
}

export function getSdk(domain: DomainDescription, signerOrProvider: Signer | Provider): WormholeSdk {
  const sdkProviders: Dictionary<Function, DomainId> = {
    'RINKEBY-MASTER-1': getRinkebySdk,
    'RINKEBY-SLAVE-ARBITRUM-1': getArbitrumTestnetSdk,
    'KOVAN-MASTER-1': getKovanSdk,
    'KOVAN-SLAVE-OPTIMISM-1': getOptimismKovanSdk,
  }

  const domainId = getLikelyDomainId(domain)
  const signer = signerOrProvider as Signer
  if (!signer.provider && signer.connect) {
    signerOrProvider = signer.connect(new providers.JsonRpcProvider(DEFAULT_RPC_URLS[domainId]))
  }
  const sdk = (sdkProviders[domainId](signerOrProvider as any) as any)[domainId]

  const res = {
    WormholeOracleAuth: undefined,
    WormholeJoin: undefined,
    WormholeOutboundGateway: undefined,
    Vat: undefined,
    Multicall: undefined,
    Faucet: undefined,
    BasicRelay: undefined,
    TrustedRelay: undefined,
    ...sdk,
  }

  return res
}
