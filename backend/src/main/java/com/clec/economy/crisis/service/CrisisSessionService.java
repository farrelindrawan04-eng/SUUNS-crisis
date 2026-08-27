package com.clec.economy.crisis.service;

import com.clec.economy.crisis.api.CreateSessionRequest;
import com.clec.economy.crisis.api.CommandAcceptedResponse;
import com.clec.economy.crisis.api.ScheduleEventRequest;
import com.clec.economy.crisis.api.SessionStateResponse;
import com.clec.economy.crisis.api.SubmitPolicyRequest;
import com.clec.economy.crisis.api.TickAdvanceResponse;
import com.clec.economy.crisis.domain.BaselineStateFactory;
import com.clec.economy.crisis.domain.EngineState;
import com.clec.economy.crisis.track.ScenarioTrack;
import com.clec.economy.crisis.engine.CausalRecord;
import com.clec.economy.crisis.engine.TickEngine;
import com.clec.economy.crisis.engine.TickResult;
import com.clec.economy.crisis.persistence.CausalEntryEntity;
import com.clec.economy.crisis.persistence.CausalEntryRepository;
import com.clec.economy.crisis.persistence.CrisisEventEntity;
import com.clec.economy.crisis.persistence.CrisisEventRepository;
import com.clec.economy.crisis.persistence.PolicyActionEntity;
import com.clec.economy.crisis.persistence.PolicyActionRepository;
import com.clec.economy.crisis.persistence.SimulationSessionEntity;
import com.clec.economy.crisis.persistence.SimulationSessionRepository;
import com.clec.economy.crisis.persistence.StateSnapshotEntity;
import com.clec.economy.crisis.persistence.StateSnapshotRepository;
import com.clec.economy.crisis.persistence.TickEntity;
import com.clec.economy.crisis.persistence.TickRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.clec.economy.auth.StaffAuthService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CrisisSessionService {
    private final SimulationSessionRepository sessionRepository;
    private final TickRepository tickRepository;
    private final StateSnapshotRepository snapshotRepository;
    private final PolicyActionRepository policyRepository;
    private final CrisisEventRepository eventRepository;
    private final CausalEntryRepository causalRepository;
    private final TickEngine tickEngine;
    private final ScenarioTrackService trackService;
    private final ObjectMapper objectMapper;
    private final StaffAuthService authService;

    public CrisisSessionService(SimulationSessionRepository sessionRepository, TickRepository tickRepository,
                                StateSnapshotRepository snapshotRepository, PolicyActionRepository policyRepository,
                                CrisisEventRepository eventRepository, CausalEntryRepository causalRepository,
                                TickEngine tickEngine, ScenarioTrackService trackService, ObjectMapper objectMapper,
                                StaffAuthService authService) {
        this.sessionRepository = sessionRepository;
        this.tickRepository = tickRepository;
        this.snapshotRepository = snapshotRepository;
        this.policyRepository = policyRepository;
        this.eventRepository = eventRepository;
        this.causalRepository = causalRepository;
        this.tickEngine = tickEngine;
        this.trackService = trackService;
        this.objectMapper = objectMapper;
        this.authService = authService;
    }

    @Transactional
    public SessionStateResponse create(CreateSessionRequest request) {
        String name = request.getName() == null || request.getName().isBlank()
                ? "Untitled crisis session" : request.getName().trim();
        long seed = request.getSeed() == null ? 1L : request.getSeed();
        require(request.getTrackId() != null && !request.getTrackId().isBlank(), "trackId is required");
        ScenarioTrack track = trackService.require(request.getTrackId());
        String sessionId = UUID.randomUUID().toString();
        String tickId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        EngineState state = BaselineStateFactory.create();
        String json = writeState(state);
        String hash = sha256(json);

        SimulationSessionEntity session = new SimulationSessionEntity(sessionId, name, seed, track.getId(), now);
        sessionRepository.save(session);
        tickRepository.save(new TickEntity(tickId, sessionId, seed, hash, now));
        snapshotRepository.save(new StateSnapshotEntity(
                UUID.randomUUID().toString(), sessionId, tickId, json, hash, now));
        return response(session, state, track);
    }

    @Transactional(readOnly = true)
    public SessionStateResponse get(String sessionId) {
        SimulationSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
        StateSnapshotEntity snapshot = snapshotRepository.findFirstBySessionIdOrderByTickNumberDesc(sessionId)
                .orElseThrow(() -> new IllegalStateException("Session has no state snapshot"));
        ScenarioTrack track = session.getTrackId() == null ? null : trackService.require(session.getTrackId());
        return response(session, readState(snapshot.getStateJson()), track);
    }

    @Transactional(readOnly = true)
    public List<SessionStateResponse> list() {
        return sessionRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(session -> {
                    StateSnapshotEntity snapshot = snapshotRepository
                            .findFirstBySessionIdOrderByTickNumberDesc(session.getId())
                            .orElseThrow(() -> new IllegalStateException("Session has no state snapshot"));
                    ScenarioTrack track = session.getTrackId() == null ? null : trackService.require(session.getTrackId());
                    return response(session, readState(snapshot.getStateJson()), track);
                }).collect(Collectors.toList());
    }

    @Transactional
    public CommandAcceptedResponse submitPolicy(String sessionId, SubmitPolicyRequest request, String username) {
        SimulationSessionEntity session = requireSession(sessionId);
        require(request.getActionType() != null, "actionType is required");
        require(request.getAuthority() != null && !request.getAuthority().isBlank(), "authority is required");
        requireFinitePositive(request.getScale(), "scale");
        requireFiniteNonNegative(request.getResourceCommitment(), "resourceCommitment");
        requireUnitInterval(request.getCredibility(), "credibility");
        requireUnitInterval(request.getCoverage(), "coverage");
        require(request.getImplementationDelay() >= 0, "implementationDelay cannot be negative");
        require(request.getDuration() > 0, "duration must be positive");

        long activation = session.getCurrentTick() + request.getImplementationDelay() + 1;
        long end = activation + request.getDuration() - 1;
        String id = UUID.randomUUID().toString();
        policyRepository.save(new PolicyActionEntity(id, sessionId, request.getActionType(),
                request.getAuthority().trim(), request.getScale(), request.getResourceCommitment(),
                request.getCredibility(), request.getCoverage(), session.getCurrentTick(), activation, end,
                request.getConditions(), request.getSourceDirectiveId(), authService.find(username).getId(), Instant.now()));
        return new CommandAcceptedResponse(id, activation, end);
    }

    @Transactional
    public CommandAcceptedResponse scheduleEvent(String sessionId, ScheduleEventRequest request) {
        SimulationSessionEntity session = requireSession(sessionId);
        require(request.getEventType() != null, "eventType is required");
        requireFinitePositive(request.getMagnitude(), "magnitude");
        require(request.getDelay() >= 0, "delay cannot be negative");
        require(request.getDuration() > 0, "duration must be positive");

        long activation = session.getCurrentTick() + request.getDelay() + 1;
        long end = activation + request.getDuration() - 1;
        String id = UUID.randomUUID().toString();
        eventRepository.save(new CrisisEventEntity(id, sessionId, request.getEventType(),
                request.getMagnitude(), activation, end, request.getDescription(), Instant.now()));
        return new CommandAcceptedResponse(id, activation, end);
    }

    @Transactional
    public TickAdvanceResponse advance(String sessionId) {
        SimulationSessionEntity session = requireSession(sessionId);
        StateSnapshotEntity previous = snapshotRepository.findFirstBySessionIdOrderByTickNumberDesc(sessionId)
                .orElseThrow(() -> new IllegalStateException("Session has no state snapshot"));
        EngineState current = readState(previous.getStateJson());
        long nextTick = current.getTick() + 1;
        List<com.clec.economy.crisis.domain.PolicyAction> policies = policyRepository
                .findBySessionIdAndActivationTickLessThanEqualAndEndTickGreaterThanEqual(sessionId, nextTick, nextTick)
                .stream().map(PolicyActionEntity::toDomain).collect(Collectors.toList());
        List<com.clec.economy.crisis.domain.CrisisEvent> events = eventRepository
                .findBySessionIdAndActivationTickLessThanEqualAndEndTickGreaterThanEqual(sessionId, nextTick, nextTick)
                .stream().map(CrisisEventEntity::toDomain).collect(Collectors.toList());

        ScenarioTrack track = trackService.require(session.getTrackId());
        TickResult result = tickEngine.advance(current, session.getTickMinutes(), policies, events, track);
        String json = writeState(result.getState());
        String hash = sha256(json);
        String tickId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        long seed = session.getDeterministicSeed() + nextTick;

        tickRepository.save(new TickEntity(tickId, sessionId, nextTick,
                result.getState().getSimulationTimeMinutes(), seed, previous.getStateHash(), hash, now));
        snapshotRepository.save(new StateSnapshotEntity(UUID.randomUUID().toString(), sessionId, tickId,
                nextTick, json, hash, now));
        int sequence = 0;
        for (CausalRecord record : result.getCausalRecords()) {
            causalRepository.save(new CausalEntryEntity(UUID.randomUUID().toString(), sessionId, tickId,
                    nextTick, sequence++, record, now));
        }
        session.commitTick(nextTick, now);
        sessionRepository.save(session);
        return new TickAdvanceResponse(response(session, result.getState(), track), result.getCausalRecords());
    }

    private SimulationSessionEntity requireSession(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + sessionId));
    }

    private void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }

    private void requireFinitePositive(double value, String field) {
        require(Double.isFinite(value) && value > 0, field + " must be finite and positive");
    }

    private void requireFiniteNonNegative(double value, String field) {
        require(Double.isFinite(value) && value >= 0, field + " must be finite and non-negative");
    }

    private void requireUnitInterval(double value, String field) {
        require(Double.isFinite(value) && value >= 0 && value <= 1, field + " must be between 0 and 1");
    }

    private SessionStateResponse response(SimulationSessionEntity session, EngineState state, ScenarioTrack track) {
        return new SessionStateResponse(session.getId(), session.getName(), session.getStatus(),
                session.getDeterministicSeed(), session.getEngineVersion(), state, track);
    }

    private String writeState(EngineState state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize engine state", exception);
        }
    }

    private EngineState readState(String json) {
        try {
            return objectMapper.readValue(json, EngineState.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to deserialize engine state", exception);
        }
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                hex.append(String.format("%02x", item & 0xff));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
