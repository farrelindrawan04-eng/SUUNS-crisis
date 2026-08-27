package com.clec.economy.operations;

import com.clec.economy.auth.StaffAuthService;
import com.clec.economy.auth.StaffUserEntity;
import com.clec.economy.crisis.persistence.SimulationSessionRepository;
import com.clec.economy.crisis.service.CrisisSessionService;
import com.clec.economy.crisis.persistence.PolicyActionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OperationsService {
    private final DelegateProfileRepository profiles; private final DirectiveRepository directives;
    private final DirectiveMessageRepository messages; private final SimulationSessionRepository sessions;
    private final StaffAuthService auth;
    private final CrisisSessionService crisisSessions;
    private final PolicyActionRepository policyActions;
    public OperationsService(DelegateProfileRepository profiles, DirectiveRepository directives,
                             DirectiveMessageRepository messages, SimulationSessionRepository sessions, StaffAuthService auth,
                             CrisisSessionService crisisSessions, PolicyActionRepository policyActions) {
        this.profiles=profiles; this.directives=directives; this.messages=messages; this.sessions=sessions; this.auth=auth; this.crisisSessions=crisisSessions;this.policyActions=policyActions;
    }

    @Transactional
    public OperationsDtos.DelegateResponse createDelegate(String sessionId, OperationsDtos.CreateDelegateRequest request, String creatorName) {
        require(sessions.existsById(sessionId), "session not found");
        requireText(request.getTitle(), "title"); requireText(request.getOrganization(), "organization");
        StaffUserEntity creator=auth.find(creatorName);
        StaffUserEntity user=auth.createDelegate(request.getUsername(), request.getDisplayName(), request.getPassword(), creatorName);
        DelegateProfileEntity profile=profiles.save(new DelegateProfileEntity(UUID.randomUUID().toString(), user.getId(), sessionId,
                request.getTitle().trim(), request.getOrganization().trim(), clean(request.getBrief()), creator.getId(), Instant.now()));
        return new OperationsDtos.DelegateResponse(profile, user.getUsername(), user.getDisplayName());
    }
    @Transactional(readOnly=true)
    public List<OperationsDtos.DelegateResponse> listDelegates(String sessionId) {
        return profiles.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .filter(profile -> auth.findById(profile.getUserId()).isEnabled())
                .map(this::delegateResponse).collect(Collectors.toList());
    }
    @Transactional
    public void deactivateDelegate(String profileId) {
        DelegateProfileEntity profile=profiles.findById(profileId).orElseThrow(()->new EntityNotFoundException("delegate not found"));
        auth.deactivateDelegate(profile.getUserId());
    }
    @Transactional(readOnly=true)
    public OperationsDtos.DelegateResponse currentDelegate(String username) { return delegateResponse(profileFor(username)); }
    @Transactional(readOnly=true)
    public OperationsDtos.PublicSituationResponse publicSituation(String username) {
        return new OperationsDtos.PublicSituationResponse(crisisSessions.get(profileFor(username).getSessionId()));
    }

    @Transactional
    public OperationsDtos.DirectiveResponse createDirective(OperationsDtos.CreateDirectiveRequest request, String username) {
        DelegateProfileEntity profile=profileFor(username); requireText(request.getTitle(), "title"); requireText(request.getBody(), "body");
        Instant now=Instant.now(); DirectivePriority priority=request.getPriority()==null ? DirectivePriority.ROUTINE : request.getPriority();
        DirectiveEntity directive=directives.save(new DirectiveEntity(UUID.randomUUID().toString(), profile.getSessionId(), profile.getId(),
                request.getTitle().trim(), request.getBody().trim(), priority, now));
        return response(directive, Collections.emptyList());
    }
    @Transactional(readOnly=true)
    public List<OperationsDtos.DirectiveResponse> listForSession(String sessionId) { return responses(directives.findBySessionIdOrderByUpdatedAtDesc(sessionId)); }
    @Transactional(readOnly=true)
    public List<OperationsDtos.DirectiveResponse> listForDelegate(String username) { return responses(directives.findByDelegateIdOrderByUpdatedAtDesc(profileFor(username).getId())); }

    @Transactional
    public OperationsDtos.DirectiveResponse staffRespond(String id, OperationsDtos.MessageRequest request, String username) {
        return addMessage(id, request, username, MessageDirection.STAFF_TO_DELEGATE, false);
    }
    @Transactional
    public OperationsDtos.DirectiveResponse delegateRespond(String id, OperationsDtos.MessageRequest request, String username) {
        return addMessage(id, request, username, MessageDirection.DELEGATE_TO_STAFF, true);
    }
    @Transactional
    public OperationsDtos.DirectiveResponse updateStatus(String id, OperationsDtos.StatusRequest request, String username) {
        require(request.getStatus()!=null, "status is required"); DirectiveEntity d=requireDirective(id);
        d.updateStatus(request.getStatus(), auth.find(username).getId(), Instant.now()); return response(directives.save(d), messagesFor(Collections.singletonList(d)));
    }
    private OperationsDtos.DirectiveResponse addMessage(String id, OperationsDtos.MessageRequest request, String username,
                                                         MessageDirection direction, boolean verifyDelegate) {
        requireText(request.getBody(), "body"); DirectiveEntity d=requireDirective(id); StaffUserEntity user=auth.find(username);
        if (verifyDelegate) require(d.getDelegateId().equals(profileFor(username).getId()), "directive does not belong to this delegate");
        messages.save(new DirectiveMessageEntity(UUID.randomUUID().toString(), id, user.getId(), direction, request.getBody().trim(), Instant.now()));
        d.touch(Instant.now()); directives.save(d); return response(d, messagesFor(Collections.singletonList(d)));
    }
    private List<OperationsDtos.DirectiveResponse> responses(List<DirectiveEntity> items) {
        List<DirectiveMessageEntity> all=items.isEmpty()?Collections.emptyList():messages.findByDirectiveIdInOrderByCreatedAtAsc(items.stream().map(DirectiveEntity::getId).collect(Collectors.toList()));
        return items.stream().map(d -> response(d, toMessages(all.stream().filter(m -> m.getDirectiveId().equals(d.getId())).collect(Collectors.toList())))).collect(Collectors.toList());
    }
    private List<OperationsDtos.MessageResponse> messagesFor(List<DirectiveEntity> items) {
        if(items.isEmpty()) return Collections.emptyList();
        return toMessages(messages.findByDirectiveIdInOrderByCreatedAtAsc(items.stream().map(DirectiveEntity::getId).collect(Collectors.toList())));
    }
    private List<OperationsDtos.MessageResponse> toMessages(List<DirectiveMessageEntity> items) {
        return items.stream().map(m -> new OperationsDtos.MessageResponse(m, auth.findById(m.getAuthorUserId()).getDisplayName())).collect(Collectors.toList());
    }
    private OperationsDtos.DelegateResponse delegateResponse(DelegateProfileEntity p) { StaffUserEntity u=auth.findById(p.getUserId()); return new OperationsDtos.DelegateResponse(p,u.getUsername(),u.getDisplayName()); }
    private OperationsDtos.DirectiveResponse response(DirectiveEntity d,List<OperationsDtos.MessageResponse> m) {
        String actor=d.getLastActionBy()==null?null:auth.findById(d.getLastActionBy()).getDisplayName();
        List<OperationsDtos.EngineActionResponse> actions=policyActions.findBySourceDirectiveIdOrderByCreatedAtDesc(d.getId()).stream()
                .map(action->new OperationsDtos.EngineActionResponse(action,action.getSubmittedBy()==null?null:auth.findById(action.getSubmittedBy()).getDisplayName()))
                .collect(Collectors.toList());
        return new OperationsDtos.DirectiveResponse(d,delegateResponse(profiles.findById(d.getDelegateId()).orElseThrow(()->new EntityNotFoundException("delegate not found"))).displayName,actor,m,actions);
    }
    private DelegateProfileEntity profileFor(String username) { StaffUserEntity u=auth.find(username); return profiles.findByUserId(u.getId()).orElseThrow(()->new EntityNotFoundException("delegate profile not found")); }
    private DirectiveEntity requireDirective(String id) { return directives.findById(id).orElseThrow(()->new EntityNotFoundException("directive not found")); }
    private void requireText(String value,String field){require(value!=null&&!value.isBlank(),field+" is required");}
    private String clean(String value){return value==null?"":value.trim();}
    private void require(boolean condition,String message){if(!condition)throw new IllegalArgumentException(message);}
}
