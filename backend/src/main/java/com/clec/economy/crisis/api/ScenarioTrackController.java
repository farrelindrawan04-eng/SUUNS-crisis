package com.clec.economy.crisis.api;

import com.clec.economy.crisis.service.ScenarioTrackService;
import com.clec.economy.crisis.track.ScenarioTrack;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/crisis/tracks")
public class ScenarioTrackController {
    private final ScenarioTrackService trackService;

    public ScenarioTrackController(ScenarioTrackService trackService) {
        this.trackService = trackService;
    }

    @GetMapping
    public List<ScenarioTrack> list() { return trackService.list(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioTrack create(@RequestBody CreateTrackRequest request, Authentication authentication) {
        return trackService.create(request, authentication.getName());
    }
}
