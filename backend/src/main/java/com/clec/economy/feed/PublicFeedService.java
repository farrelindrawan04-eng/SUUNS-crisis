package com.clec.economy.feed;

import com.clec.economy.auth.StaffAuthService;
import com.clec.economy.auth.StaffUserEntity;
import com.clec.economy.crisis.persistence.SimulationSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PublicFeedService {
    private final PublicFeedCardRepository cards; private final SimulationSessionRepository sessions;
    private final StaffAuthService auth; private final PublicFeedLiveHub live;
    public PublicFeedService(PublicFeedCardRepository cards,SimulationSessionRepository sessions,StaffAuthService auth,PublicFeedLiveHub live){this.cards=cards;this.sessions=sessions;this.auth=auth;this.live=live;}
    @Transactional(readOnly=true)
    public List<FeedDtos.CardResponse> publicCards(String sessionId){return cards.findBySessionIdAndStatusOrderByPublishedAtDesc(sessionId,FeedCardStatus.PUBLISHED).stream().map(this::response).collect(Collectors.toList());}
    @Transactional(readOnly=true)
    public List<FeedDtos.CardResponse> staffCards(String sessionId){return cards.findBySessionIdOrderByUpdatedAtDesc(sessionId).stream().map(this::response).collect(Collectors.toList());}
    @Transactional
    public FeedDtos.CardResponse create(String sessionId,FeedDtos.CardRequest request,String username){
        require(sessions.existsById(sessionId),"session not found"); validate(request); StaffUserEntity user=auth.find(username); Instant now=Instant.now();
        PublicFeedCardEntity card=new PublicFeedCardEntity(UUID.randomUUID().toString(),sessionId,request.getHeadline().trim(),request.getSummary().trim(),request.getCategory().trim(),request.getSeverity(),user.getId(),now);
        card.update(card.getHeadline(),card.getSummary(),card.getCategory(),card.getSeverity(),request.getStatus()==null?FeedCardStatus.DRAFT:request.getStatus(),user.getId(),now);
        FeedDtos.CardResponse result=response(cards.save(card)); if(card.getStatus()==FeedCardStatus.PUBLISHED)live.publish(sessionId,result); return result;
    }
    @Transactional
    public FeedDtos.CardResponse update(String id,FeedDtos.CardRequest request,String username){
        validate(request); PublicFeedCardEntity card=cards.findById(id).orElseThrow(()->new EntityNotFoundException("feed card not found"));
        card.update(request.getHeadline().trim(),request.getSummary().trim(),request.getCategory().trim(),request.getSeverity(),request.getStatus()==null?card.getStatus():request.getStatus(),auth.find(username).getId(),Instant.now());
        FeedDtos.CardResponse result=response(cards.save(card)); live.publish(card.getSessionId(),result); return result;
    }
    private FeedDtos.CardResponse response(PublicFeedCardEntity card){
        String updater=card.getUpdatedBy()==null?null:auth.findById(card.getUpdatedBy()).getDisplayName();
        return new FeedDtos.CardResponse(card,auth.findById(card.getCreatedBy()).getDisplayName(),updater);
    }
    private void validate(FeedDtos.CardRequest r){require(r!=null,"card is required");require(text(r.getHeadline()),"headline is required");require(text(r.getSummary()),"summary is required");require(text(r.getCategory()),"category is required");require(r.getSeverity()!=null,"severity is required");}
    private boolean text(String v){return v!=null&&!v.isBlank();} private void require(boolean ok,String message){if(!ok)throw new IllegalArgumentException(message);}
}
