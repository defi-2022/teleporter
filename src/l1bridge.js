async function bridgeToArbitrum() {
    const l1Provider = new ethers.providers.Web3Provider(window.ethereum)
    const l2Provider = new providers.JsonRpcProvider(DEFAULT_RPC_URLS['RINKEBY-SLAVE-ARBITRUM-1'])

    const l2Network = await getL2Network(l2Provider)
    const erc20Bridge = new Erc20Bridger(l2Network)
    const erc20Address = '0x6A9865aDE2B6207dAAC49f8bCba9705dEB0B0e6D'

    const expectedL1GatewayAddress = await erc20Bridge.getL1GatewayAddress(erc20Address, l1Provider)
    // const initialBridgeTokenBalance = await l1DappToken.balanceOf(
    //   expectedL1GatewayAddress
    // )

    const tokenDepositAmount = 1

    // const approveTx = await erc20Bridge.approveToken({
    //   l1Signer: l1Provider.getSigner(),
    //   erc20L1Address: erc20Address,
    // })

    // const approveRec = await approveTx.wait()

    const depositTx = await erc20Bridge.deposit({
      amount: tokenDepositAmount,
      erc20L1Address: erc20Address,
      l1Signer: l1Provider.getSigner(),
      l2Provider: l2Provider,
    })

    // const depositRec = await depositTx.wait()
    // const l2Result = await depositRec.waitForL2(l2Provider)
    const rec = await depositTx.wait()
    //console.log(`L1 deposit txn confirmed — L1 txn hash: ${rec.transactionHash}`)
    const l1ToL2Message = await rec.getL1ToL2Message(l2Provider.getSigner() /** <-- connected ethers-js Wallet */)

    const res = await l1ToL2Message.waitForStatus()

    if (res.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
      /** Message wasn't auto-redeemed; redeem it now: */
      const response = await l1ToL2Message.redeem()
      const receipt = await response.wait()
    } else if (res.status === L1ToL2MessageStatus.REDEEMED) {
      /** Message succesfully redeeemed */
    }
  }