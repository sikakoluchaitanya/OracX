import React, { useState , useEffect} from 'react'
import { Input, Popover, Radio, Modal, message } from 'antd'
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from "wagmi";

function Swap(props) {
  const { address, isConnected } = props;
  const { messageApi, contextHolder } = message.useMessage();
  const [slippage, setSlippage] = useState(2.5)
  const [tokenOneAmount, setTokenOneAmount] = useState(null)
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null)
  const [tokenOne, setTokenOne] = useState(tokenList[0])
  const [tokenTwo, setTokenTwo] = useState(tokenList[1])
  const [isOpen, setIsOpen] = useState(false)
  const [changeToken, setChangeToken] = useState(1)
  const [Prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({
    to:null,
    data:null,
    value: null,
  });

  const {data, sendTransaction} = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value),
    }
  })

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })

  function handleSlippageChange(e){
    setSlippage(e.target.value)
  }

  function changeAmount(e){
    setTokenOneAmount(e.target.value)
    if(e.target.value && Prices){
      setTokenTwoAmount((e.target.value * Prices.ratio).toFixed(2))
    }else{
      setTokenTwoAmount(null);
    }
  }

  function switchTokens(){
    setPrices(null);
    setTokenOneAmount(null)
    setTokenTwoAmount(null)
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two)
    setTokenTwo(one)
  }

  function openModal(asset){
    setIsOpen(true);
    setChangeToken(asset);
  }

  function modifyToken(i){
    setPrices(null)
    setTokenOneAmount(null)
    setTokenTwoAmount(null)
    if(changeToken === 1){
      setTokenOne(tokenList[i]);
      fetchPrices(tokenList[i].address, tokenTwo.address)
    } else {
      setTokenTwo(tokenList[i]);
      fetchPrices(tokenOne.address, tokenList[i].address)
    }
    setIsOpen(false);
  }

  async function fetchPrices(one, two){
    const res = await axios.get(`http://localhost:3001/tokenPrice`,{
      params: {addressOne: one, addressTwo: two}
    })
    setPrices(res.data)
  }

  async function fetchDexSwap(){
    const url_allowance = "https://api.1inch.dev/swap/v6.0/1/approve/allowance";

    const config = {
        headers: {
          "Authorization": "Bearer 1az3megiHQ647UVPXBBoKOf5dONTXLxA"
        },
        params: {
          "tokenAddress": tokenOne.address,
          "walletAddress": address
        },
        paramsSerializer: {
          indexes: null
        }
    };

    try {
      const allowance = await axios.get(url_allowance, config);
    } catch (error) {
      console.error(error);
    }

    if(allowance.data.allowance === "0"){
      const url_approve = "https://api.1inch.dev/swap/v6.0/1/approve/transaction";

      const config = {
        headers: {
          "Authorization": "Bearer 1az3megiHQ647UVPXBBoKOf5dONTXLxA"
        },
        params: {
          "tokenAddress": tokenOne.address,
        },
        paramsSerializer: {
          indexes: null
        }
      };

      try {
        const approve = await axios.get(url_approve, config);
      } catch (error) {
        console.error(error);
      }

      setTxDetails(approve.data);
      console.log("not approved");
      return
    }

    const tx = async function httpCall() {
    
      const url = "https://api.1inch.dev/swap/v6.0/1/swap";
    
      const config = {
          headers: {
            "Authorization": "Bearer 1az3megiHQ647UVPXBBoKOf5dONTXLxA"
          },
          params: {
            "fromTokenAddress": tokenOne.address,
            "toTokenAddress": tokenTwo.address,
            "amount": tokenOneAmount.padEnd(tokenOne.decimals+tokenOneAmount.length, '0'),
            "fromAddress": address,
            "slippage": slippage
          },
          paramsSerializer: {
            indexes: null
          }
        };
        
        try {
          const response = await axios.get(url, config);
          console.log(response.data);
        } catch (error) {
          console.error(error);
        }
    }

    let decimals = Number(`1E${tokenOne.decimals}`);
    setTokenTwoAmount((Number(tx.data.toTokenAmount) / decimals).toFixed(2))
    setTxDetails(tx.data.tx)
  }  


  useEffect(()=>{
    fetchPrices(tokenList[0].address, tokenList[1].address)
  },[])

  useEffect(()=> {
    if(txDetails.to && isConnected){
      sendTransaction();
    }
  }, [txDetails])

  useEffect(()=> {
    messageApi.destroy();
    if(isLoading){
      messageApi.open({
        type: 'loading',
        content: 'Swap in progress...',
        duration: 0
      })
    }
  }, [isLoading])

  useEffect(() => {
    messageApi.destroy();
    if (isSuccess) {
      messageApi.destroy();
      messageApi.open({
        type: 'success',
        content: 'Swap successful!',
        duration: 2
      });
    }else if(txDetails.to){
      messageApi.open({
        type: 'error',
        content: 'Swap failed!',
        duration: 2
      })
    }
  }, [isSuccess]);


  const setting = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  )
  return (
    <>
    { contextHolder }
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
      >
        <div className='modalContent'>
          {tokenList?.map((e,i) => {
            return (
              <div
                className='tokenChoice'
                key={i}
                onClick={() => modifyToken(i)}
              > 
                <img src={e.img} alt={e.ticker} className='tokenLogo'/>
                <div className='tokenChoiceNames'>
                  <div className='tokenName'>{e.name}</div>
                  <div className='tokenTicker'>{e.ticker}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <div className='tradeBox'>
      <div className='tradeBoxHeader'>
        <h4>Swap</h4>
        <Popover
          content={ setting}
          title="Settings"
          trigger="click"
          placement='bottomRight'
        >
          <SettingOutlined className="cog"/>
        </Popover>
      </div>
      <div className='inputs'>
        <Input
          placeholder="0"
          value={tokenOneAmount}
          onChange={changeAmount}
          disabled={!Prices}
        />
        <Input
          placeholder="0"
          value={tokenTwoAmount}
          disabled={true}
        />
        <div className='switchButton' onClick={switchTokens}>
          <ArrowDownOutlined className='switchArrow'/>
        </div>
        <div className='assetOne' onClick={ () => openModal(1)}  >
          <img src={tokenOne.img} alt="assetOneLogo" className='assetLogo'/>
          {tokenOne.ticker}
          <DownOutlined />
        </div>
        <div className='assetTwo' onClick={ () => openModal(2)}>
          <img src={tokenTwo.img} alt="assetTwoLogo" className='assetLogo'/>
          {tokenTwo.ticker}
          <DownOutlined />
        </div>
      </div>
      <div className='swapButton' disabled={!tokenOneAmount || !isConnected } onClick={fetchDexSwap}>Swap</div>
    </div>
    </>
  )

}

export default Swap