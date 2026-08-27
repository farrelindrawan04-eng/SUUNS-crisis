package com.clec.economy.feed;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class PublicFeedLiveHub {
    private final Map<String, List<SseEmitter>> listeners = new ConcurrentHashMap<>();
    public SseEmitter subscribe(String sessionId) {
        SseEmitter emitter=new SseEmitter(0L); listeners.computeIfAbsent(sessionId,key->new CopyOnWriteArrayList<>()).add(emitter);
        Runnable remove=()->listeners.getOrDefault(sessionId,java.util.Collections.emptyList()).remove(emitter);
        emitter.onCompletion(remove); emitter.onTimeout(remove); emitter.onError(error->remove.run());
        try { emitter.send(SseEmitter.event().name("connected").data("ready")); } catch(IOException error){remove.run();}
        return emitter;
    }
    public void publish(String sessionId,FeedDtos.CardResponse card) {
        for(SseEmitter emitter:listeners.getOrDefault(sessionId,java.util.Collections.emptyList())){
            try { emitter.send(SseEmitter.event().name("feed-card").id(card.id).data(card)); }
            catch(IOException error){emitter.complete();}
        }
    }
}
