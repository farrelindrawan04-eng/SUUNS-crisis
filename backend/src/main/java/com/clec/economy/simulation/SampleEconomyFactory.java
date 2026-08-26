package com.clec.economy.simulation;

import com.clec.economy.domain.EconomicUnit;
import com.clec.economy.domain.ProductionRule;
import com.clec.economy.domain.Resource;
import com.clec.economy.domain.ResourceLedger;
import com.clec.economy.domain.UnitType;

public final class SampleEconomyFactory {
    private SampleEconomyFactory() {
    }

    public static EconomicUnit create() {
        EconomicUnit world = new EconomicUnit("World Economy", UnitType.WORLD, ResourceLedger.with(Resource.MONEY, 1_000.0));

        EconomicUnit region = new EconomicUnit("Coastal Region", UnitType.REGION,
                ResourceLedger.with(Resource.KNOWLEDGE, 15.0));

        EconomicUnit householdSector = new EconomicUnit("Household Sector", UnitType.SECTOR,
                ResourceLedger.with(Resource.MONEY, 400.0).plus(Resource.LABOR, 18.0));

        EconomicUnit manufacturing = new EconomicUnit("Manufacturing Firm", UnitType.FIRM,
                ResourceLedger.with(Resource.MONEY, 180.0).plus(Resource.LABOR, 6.0).plus(Resource.ENERGY, 10.0));

        EconomicUnit energy = new EconomicUnit("Energy Firm", UnitType.FIRM,
                ResourceLedger.with(Resource.MONEY, 120.0).plus(Resource.LABOR, 4.0).plus(Resource.ENERGY, 14.0));

        manufacturing.addProductionRule(ProductionRule.fixed(
                "Manufacture goods",
                ResourceLedger.with(Resource.LABOR, 1.0).plus(Resource.ENERGY, 1.0),
                ResourceLedger.with(Resource.GOODS, 3.0)));

        energy.addProductionRule(ProductionRule.fixed(
                "Generate usable energy knowledge",
                ResourceLedger.with(Resource.LABOR, 0.5).plus(Resource.ENERGY, 1.0),
                ResourceLedger.with(Resource.KNOWLEDGE, 0.4)));

        region.addChild(householdSector);
        region.addChild(manufacturing);
        region.addChild(energy);
        world.addChild(region);
        return world;
    }
}
