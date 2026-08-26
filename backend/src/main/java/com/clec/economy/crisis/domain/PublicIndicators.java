package com.clec.economy.crisis.domain;

public class PublicIndicators {
    private double bankingStability;
    private double currencyStrength;
    private double economicActivity;
    private double essentialSupplySecurity;
    private double sovereignCreditworthiness;
    private double publicConfidence;
    private double civilUnrest;
    private double pricePressure;
    private double householdPurchasingPower;

    public PublicIndicators() {
    }

    public PublicIndicators(double bankingStability, double currencyStrength, double economicActivity,
                            double essentialSupplySecurity, double sovereignCreditworthiness,
                            double publicConfidence, double civilUnrest, double pricePressure,
                            double householdPurchasingPower) {
        this.bankingStability = bounded(bankingStability);
        this.currencyStrength = bounded(currencyStrength);
        this.economicActivity = bounded(economicActivity);
        this.essentialSupplySecurity = bounded(essentialSupplySecurity);
        this.sovereignCreditworthiness = bounded(sovereignCreditworthiness);
        this.publicConfidence = bounded(publicConfidence);
        this.civilUnrest = bounded(civilUnrest);
        this.pricePressure = bounded(pricePressure);
        this.householdPurchasingPower = bounded(householdPurchasingPower);
    }

    public double getBankingStability() { return bankingStability; }
    public double getCurrencyStrength() { return currencyStrength; }
    public double getEconomicActivity() { return economicActivity; }
    public double getEssentialSupplySecurity() { return essentialSupplySecurity; }
    public double getSovereignCreditworthiness() { return sovereignCreditworthiness; }
    public double getPublicConfidence() { return publicConfidence; }
    public double getCivilUnrest() { return civilUnrest; }
    public double getPricePressure() { return pricePressure; }
    public double getHouseholdPurchasingPower() { return householdPurchasingPower; }

    public PublicIndicators adjusted(double banking, double currency, double activity, double supply,
                                     double credit, double confidence, double unrest, double prices,
                                     double purchasingPower) {
        return new PublicIndicators(
                bankingStability + banking,
                currencyStrength + currency,
                economicActivity + activity,
                essentialSupplySecurity + supply,
                sovereignCreditworthiness + credit,
                publicConfidence + confidence,
                civilUnrest + unrest,
                pricePressure + prices,
                householdPurchasingPower + purchasingPower
        );
    }

    private static double bounded(double value) {
        if (!Double.isFinite(value)) throw new IllegalArgumentException("Indicator must be finite");
        return Math.max(0.0, Math.min(100.0, value));
    }
}
