// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Sensei Herb Token (SENSEI)
/// @notice ERC-20 estándar de OpenZeppelin con suministro fijo.
/// Todo el suministro se acuña una única vez en el constructor y se reparte entre
/// las direcciones de asignación declaradas. No existe función de mint, ni owner,
/// ni pausa, ni lista negra, ni impuestos de transferencia: el contrato no tiene
/// ningún privilegio administrativo después del despliegue.
contract SenseiHerbToken is ERC20 {
    struct Allocation {
        string category;
        address recipient;
        uint256 amount;
    }

    /// @notice Emitido una vez por categoría durante el despliegue.
    event InitialAllocation(string category, address indexed recipient, uint256 amount);

    error LengthMismatch();
    error NoAllocations();
    error ZeroRecipient(uint256 index);
    error ZeroAmount(uint256 index);
    error SupplyMismatch(uint256 expected, uint256 allocated);

    /// @notice Suministro total fijo (en unidades mínimas, 18 decimales).
    uint256 public immutable MAX_SUPPLY;

    Allocation[] private _allocations;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        string[] memory categories,
        address[] memory recipients,
        uint256[] memory amounts
    ) ERC20(name_, symbol_) {
        uint256 n = categories.length;
        if (n == 0) revert NoAllocations();
        if (recipients.length != n || amounts.length != n) revert LengthMismatch();

        uint256 allocated;
        for (uint256 i = 0; i < n; ++i) {
            if (recipients[i] == address(0)) revert ZeroRecipient(i);
            if (amounts[i] == 0) revert ZeroAmount(i);
            allocated += amounts[i];
            _allocations.push(Allocation(categories[i], recipients[i], amounts[i]));
            _mint(recipients[i], amounts[i]);
            emit InitialAllocation(categories[i], recipients[i], amounts[i]);
        }
        if (allocated != maxSupply_) revert SupplyMismatch(maxSupply_, allocated);
        MAX_SUPPLY = maxSupply_;
    }

    /// @notice Número de asignaciones iniciales registradas.
    function allocationCount() external view returns (uint256) {
        return _allocations.length;
    }

    /// @notice Asignación inicial `index` (categoría, destinatario, cantidad).
    function allocation(uint256 index) external view returns (Allocation memory) {
        return _allocations[index];
    }
}
