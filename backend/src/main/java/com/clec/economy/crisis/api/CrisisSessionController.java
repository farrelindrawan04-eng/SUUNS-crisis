package com.clec.economy.crisis.api;

import com.clec.economy.crisis.service.CrisisSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/crisis/sessions")
public class CrisisSessionController {
    private final CrisisSessionService sessionService;

    public CrisisSessionController(CrisisSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionStateResponse create(@RequestBody CreateSessionRequest request) {
        return sessionService.create(request);
    }

    @GetMapping("/{sessionId}")
    public SessionStateResponse get(@PathVariable String sessionId) {
        return sessionService.get(sessionId);
    }

    @PostMapping("/{sessionId}/policies")
    @ResponseStatus(HttpStatus.CREATED)
    public CommandAcceptedResponse submitPolicy(@PathVariable String sessionId,
                                                 @RequestBody SubmitPolicyRequest request) {
        return sessionService.submitPolicy(sessionId, request);
    }

    @PostMapping("/{sessionId}/events")
    @ResponseStatus(HttpStatus.CREATED)
    public CommandAcceptedResponse scheduleEvent(@PathVariable String sessionId,
                                                  @RequestBody ScheduleEventRequest request) {
        return sessionService.scheduleEvent(sessionId, request);
    }

    @PostMapping("/{sessionId}/ticks")
    public TickAdvanceResponse advance(@PathVariable String sessionId) {
        return sessionService.advance(sessionId);
    }
}
