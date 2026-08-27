package com.clec.economy.crisis.engine;

import com.clec.economy.crisis.domain.EngineState;
import com.clec.economy.crisis.domain.HiddenVariables;
import com.clec.economy.crisis.domain.PublicIndicators;
import com.clec.economy.crisis.track.ScenarioTrack;
import com.clec.economy.crisis.track.TrackPhase;
import org.springframework.stereotype.Component;

@Component
public class TrackEngine {
    public TrackApplication apply(EngineState current, ScenarioTrack track, long nextTick) {
        TrackPhase phase = track.phaseAt(nextTick);
        if (phase == null) {
            return new TrackApplication(current.getPublicIndicators(), current.getHiddenVariables(),
                    new CausalRecord(TickStage.ACTIVATE_EVENTS, "TRACK", track.getId(),
                            "Track complete; no exogenous pressure applied"));
        }
        PublicIndicators visible = current.getPublicIndicators()
                .adjusted(phase.getPerTickDelta().getPublicIndicators());
        HiddenVariables hidden = current.getHiddenVariables()
                .adjusted(phase.getPerTickDelta().getHiddenVariables());
        return new TrackApplication(visible, hidden,
                new CausalRecord(TickStage.ACTIVATE_EVENTS, "TRACK", track.getId(), phase.getNarrative()));
    }

    public static class TrackApplication {
        private final PublicIndicators publicIndicators;
        private final HiddenVariables hiddenVariables;
        private final CausalRecord causalRecord;

        public TrackApplication(PublicIndicators publicIndicators, HiddenVariables hiddenVariables,
                                CausalRecord causalRecord) {
            this.publicIndicators = publicIndicators;
            this.hiddenVariables = hiddenVariables;
            this.causalRecord = causalRecord;
        }

        public PublicIndicators getPublicIndicators() { return publicIndicators; }
        public HiddenVariables getHiddenVariables() { return hiddenVariables; }
        public CausalRecord getCausalRecord() { return causalRecord; }
    }
}
