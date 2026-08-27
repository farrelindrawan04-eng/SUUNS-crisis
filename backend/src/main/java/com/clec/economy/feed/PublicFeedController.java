package com.clec.economy.feed;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;

@RestController @RequestMapping("/api/feed")
public class PublicFeedController {
    private final PublicFeedService service; private final PublicFeedLiveHub live;
    public PublicFeedController(PublicFeedService service,PublicFeedLiveHub live){this.service=service;this.live=live;}
    @GetMapping("/sessions/{sessionId}") public List<FeedDtos.CardResponse> publicFeed(@PathVariable String sessionId){return service.publicCards(sessionId);}
    @GetMapping("/sessions/{sessionId}/stream") public SseEmitter stream(@PathVariable String sessionId){return live.subscribe(sessionId);}
    @GetMapping("/staff/sessions/{sessionId}") public List<FeedDtos.CardResponse> staffFeed(@PathVariable String sessionId){return service.staffCards(sessionId);}
    @PostMapping("/staff/sessions/{sessionId}") @ResponseStatus(HttpStatus.CREATED)
    public FeedDtos.CardResponse create(@PathVariable String sessionId,@RequestBody FeedDtos.CardRequest request,Authentication authentication){return service.create(sessionId,request,authentication.getName());}
    @PutMapping("/staff/cards/{id}") public FeedDtos.CardResponse update(@PathVariable String id,@RequestBody FeedDtos.CardRequest request,Authentication authentication){return service.update(id,request,authentication.getName());}
}
