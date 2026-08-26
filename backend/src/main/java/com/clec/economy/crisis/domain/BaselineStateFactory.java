package com.clec.economy.crisis.domain;

public final class BaselineStateFactory {
    private BaselineStateFactory() {
    }

    public static EngineState create() {
        return new EngineState(
                0,
                0,
                new PublicIndicators(68, 62, 66, 64, 61, 58, 24, 32, 60),
                new HiddenVariables(65, 63, 57, 55, 60, 62, 54, 28)
        );
    }
}
