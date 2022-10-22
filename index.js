const { ethers } = require("ethers");
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const { join } = require('path');

const logger = require('./logger');

const argv = yargs(hideBin(process.argv)).argv

if (!argv.wss) {
    return displayError('Provide the websocket rpc');
}
if (!argv.key) {
    return displayError('Provide the private key of the compromised account');
}
if (!argv.target) {
    return displayError('Provide the receiving address');
}
if (!argv.abi) {
    return displayError('Provide the abi file name.');
}
if (!argv.contract) {
    return displayError('Provide the contract address');
}
if (!argv.func) {
    return displayError('Provide the contract function to call');
}
if (!argv.gas) {
    return displayError('Provide the gas price used by the sweeper in ETH unit (ex. 2.5)');
}
if (!argv.gasLimit) {
    return displayError('Provide the contract gas limit (ex. 21000)');
}
if (!fs.existsSync(join(__dirname, `./abi/${argv.abi}`))) {
    return displayError(`Contract abi ${argv.abi} doesn't exist`);
}

const provider = new ethers.providers.WebSocketProvider(process.env.WSS);
const signer = new ethers.Wallet(argv.key, provider);

if (!signer) {
    return displayError('Invalid private key');
}

const contractAbi = require(`./abi/${argv.abi}`);
const contractAddress = argv.contract;
const contractMain = new ethers.Contract(contractAddress, contractAbi, signer);

provider.on('pending', (txHash) => {
    provider.getTransaction(txHash).then(async tx => {
        if (tx && tx.to && tx.from) {
            if (tx.to.toLowerCase() === signer.address.toLowerCase()) {
                try {
                    const gasPrice = increase10(ethers.BigNumber.from(ethers.utils.parseUnits(argv.gas.toString(), 'gwei')));
                    const txFee = txGas.mul(parseInt(argv.gasLimit));
                    tx.wait().then(() => {
                        provider.getTransactionCount(signer.address).then(nonce => {
                            contractMain[argv.func](...argv.params, {
                                nonce,
                                gasLimit: ethers.BigNumber.from(argv.gasLimit),
                                gasPrice
                            }).then(log => {
                                logger('success', argv.func, log);
                                log.wait().then(() => {
                                    provider.getBalance(signer.address).then(balance => {
                                        const value = balance.sub(txFee);
                                        const txOpts = {
                                            to: argv.target,
                                            value,
                                            nonce: nonce + 1,
                                            gasLimit: ethers.BigNumber.from('21000'),
                                            gasPrice
                                        };
                                        logger('info', 'gas transfer', txOpts);
                                        signer.sendTransaction(txOpts).then(log => {
                                            logger('success', 'gas transfer', log);
                                        }).catch(e => logger('error', 'gas transfer', e.message));
                                    }).catch(e => logger('error', 'balance', e.message));
                                }).catch(e => logger('error', 'token transfer', e.message));
                            })
                        });
                    })
                } catch (e) {
                    console.log(e);
                    logger('error', 'anti-sweeper', e.message);
                }
            }
        }
    });
});


function displayError(msg) {
    logger('error', 'anti-sweeper', msg);
    process.exit(0);
}

function increase10(n) {
    return n.add(n.div(100).mul(10));
}