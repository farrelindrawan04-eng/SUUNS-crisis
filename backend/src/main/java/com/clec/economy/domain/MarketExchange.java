package com.clec.economy.domain;

public final class MarketExchange {
    private MarketExchange() {
    }

    public static void exchange(EconomicUnit buyer, EconomicUnit seller, Resource resource, double quantity, double unitPrice) {
        if (resource == Resource.MONEY) {
            throw new IllegalArgumentException("resource must not be MONEY");
        }
        if (quantity < 0.0 || unitPrice < 0.0) {
            throw new IllegalArgumentException("quantity and unitPrice must be non-negative");
        }

        double totalPrice = quantity * unitPrice;
        buyer.resources().subtract(Resource.MONEY, totalPrice);
        seller.resources().subtract(resource, quantity);
        buyer.resources().add(resource, quantity);
        seller.resources().add(Resource.MONEY, totalPrice);
    }
}
