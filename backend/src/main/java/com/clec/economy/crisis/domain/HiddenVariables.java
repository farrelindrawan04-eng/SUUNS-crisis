package com.clec.economy.crisis.domain;

public class HiddenVariables {
    private double bankLiquidity;
    private double bankCapital;
    private double foreignReserves;
    private double fiscalCapacity;
    private double infrastructureLoanHealth;
    private double importDistributionCapacity;
    private double externalFinancingAccess;
    private double depositWithdrawalPressure;

    public HiddenVariables() {
    }

    public HiddenVariables(double bankLiquidity, double bankCapital, double foreignReserves,
                           double fiscalCapacity, double infrastructureLoanHealth,
                           double importDistributionCapacity, double externalFinancingAccess,
                           double depositWithdrawalPressure) {
        this.bankLiquidity = requireFinite(bankLiquidity);
        this.bankCapital = requireFinite(bankCapital);
        this.foreignReserves = requireFinite(foreignReserves);
        this.fiscalCapacity = requireFinite(fiscalCapacity);
        this.infrastructureLoanHealth = requireFinite(infrastructureLoanHealth);
        this.importDistributionCapacity = requireFinite(importDistributionCapacity);
        this.externalFinancingAccess = requireFinite(externalFinancingAccess);
        this.depositWithdrawalPressure = requireFinite(depositWithdrawalPressure);
    }

    public double getBankLiquidity() { return bankLiquidity; }
    public double getBankCapital() { return bankCapital; }
    public double getForeignReserves() { return foreignReserves; }
    public double getFiscalCapacity() { return fiscalCapacity; }
    public double getInfrastructureLoanHealth() { return infrastructureLoanHealth; }
    public double getImportDistributionCapacity() { return importDistributionCapacity; }
    public double getExternalFinancingAccess() { return externalFinancingAccess; }
    public double getDepositWithdrawalPressure() { return depositWithdrawalPressure; }

    public HiddenVariables adjusted(double liquidity, double capital, double reserves, double fiscal,
                                    double loanHealth, double imports, double financing, double withdrawals) {
        return new HiddenVariables(
                bankLiquidity + liquidity,
                bankCapital + capital,
                foreignReserves + reserves,
                fiscalCapacity + fiscal,
                infrastructureLoanHealth + loanHealth,
                importDistributionCapacity + imports,
                externalFinancingAccess + financing,
                depositWithdrawalPressure + withdrawals
        );
    }

    private static double requireFinite(double value) {
        if (!Double.isFinite(value)) throw new IllegalArgumentException("Hidden variable must be finite");
        return value;
    }
}
