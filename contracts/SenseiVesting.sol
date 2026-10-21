// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "@openzeppelin/contracts/finance/VestingWalletCliff.sol";

/// @title SenseiVesting
/// @notice Envoltorio sin lógica propia de VestingWalletCliff de OpenZeppelin.
/// Libera tokens de forma lineal entre `start` y `start + duration`, y nada antes de
/// `start + cliff`. Nadie, ni siquiera el beneficiario, puede adelantar el calendario.
contract SenseiVesting is VestingWalletCliff {
    constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds, uint64 cliffSeconds)
        VestingWallet(beneficiary, startTimestamp, durationSeconds)
        VestingWalletCliff(cliffSeconds)
    {}
}
