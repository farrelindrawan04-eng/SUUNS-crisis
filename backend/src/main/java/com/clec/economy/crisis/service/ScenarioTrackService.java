package com.clec.economy.crisis.service;

import com.clec.economy.auth.StaffAuthService;
import com.clec.economy.auth.StaffUserEntity;
import com.clec.economy.crisis.api.CreateTrackRequest;
import com.clec.economy.crisis.persistence.ScenarioTrackEntity;
import com.clec.economy.crisis.persistence.ScenarioTrackRepository;
import com.clec.economy.crisis.track.ScenarioTrack;
import com.clec.economy.crisis.track.TrackDirection;
import com.clec.economy.crisis.track.TrackTemplateFactory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ScenarioTrackService implements CommandLineRunner {
    public static final String ADVERSE_ID = "preset-adverse-spiral";
    public static final String HEALTHY_ID = "preset-relatively-healthy";

    private final ScenarioTrackRepository repository;
    private final StaffAuthService staffAuthService;
    private final ObjectMapper objectMapper;

    public ScenarioTrackService(ScenarioTrackRepository repository, StaffAuthService staffAuthService,
                                ObjectMapper objectMapper) {
        this.repository = repository;
        this.staffAuthService = staffAuthService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seed(TrackTemplateFactory.create(ADVERSE_ID, "Adverse Spiral",
                "Currency pressure spreads through banks, households, supply, and social stability.",
                TrackDirection.ADVERSE_SPIRAL, 1.0, 36, true));
        seed(TrackTemplateFactory.create(HEALTHY_ID, "Relatively Healthy",
                "Stable funding and mild organic improvement create room for staff to preserve or deliberately break the economy.",
                TrackDirection.RELATIVELY_HEALTHY, 1.0, 36, true));
    }

    @Transactional(readOnly = true)
    public List<ScenarioTrack> list() {
        return repository.findAllByOrderByBuiltInDescCreatedAtAsc().stream()
                .map(this::deserialize).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ScenarioTrack require(String id) {
        return repository.findById(id).map(this::deserialize)
                .orElseThrow(() -> new EntityNotFoundException("Track not found: " + id));
    }

    @Transactional
    public ScenarioTrack create(CreateTrackRequest request, String creatorUsername) {
        require(request.getName() != null && !request.getName().isBlank(), "name is required");
        require(request.getDescription() != null && !request.getDescription().isBlank(), "description is required");
        require(request.getDirection() != null, "direction is required");
        require(Double.isFinite(request.getIntensity()) && request.getIntensity() >= 0.25
                && request.getIntensity() <= 3.0, "intensity must be between 0.25 and 3.0");
        require(request.getDurationTicks() >= 6 && request.getDurationTicks() <= 120,
                "durationTicks must be between 6 and 120");
        StaffUserEntity creator = staffAuthService.find(creatorUsername);
        ScenarioTrack track = TrackTemplateFactory.create(UUID.randomUUID().toString(), request.getName().trim(),
                request.getDescription().trim(), request.getDirection(), request.getIntensity(),
                request.getDurationTicks(), false);
        repository.save(entity(track, creator.getId()));
        return track;
    }

    private void seed(ScenarioTrack track) {
        if (!repository.existsById(track.getId())) repository.save(entity(track, null));
    }

    private ScenarioTrackEntity entity(ScenarioTrack track, String creatorId) {
        return new ScenarioTrackEntity(track.getId(), track.getName(), track.getDescription(), track.getDirection(),
                track.getIntensity(), track.getDurationTicks(), serialize(track), track.isBuiltIn(), creatorId, Instant.now());
    }

    private String serialize(ScenarioTrack track) {
        try { return objectMapper.writeValueAsString(track); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Unable to serialize track", exception); }
    }

    private ScenarioTrack deserialize(ScenarioTrackEntity entity) {
        try { return objectMapper.readValue(entity.getConfigJson(), ScenarioTrack.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Unable to deserialize track", exception); }
    }

    private void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
