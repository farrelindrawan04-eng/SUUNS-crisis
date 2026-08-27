package com.clec.economy.operations;

import java.time.Instant;
import java.util.List;
import com.clec.economy.crisis.domain.PublicIndicators;

public final class OperationsDtos {
    private OperationsDtos() { }

    public static class CreateDelegateRequest {
        private String username; private String displayName; private String password;
        private String title; private String organization; private String brief;
        public String getUsername() { return username; } public void setUsername(String v) { username = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { displayName = v; }
        public String getPassword() { return password; } public void setPassword(String v) { password = v; }
        public String getTitle() { return title; } public void setTitle(String v) { title = v; }
        public String getOrganization() { return organization; } public void setOrganization(String v) { organization = v; }
        public String getBrief() { return brief; } public void setBrief(String v) { brief = v; }
    }
    public static class CreateDirectiveRequest {
        private String title; private String body; private DirectivePriority priority;
        public String getTitle() { return title; } public void setTitle(String v) { title = v; }
        public String getBody() { return body; } public void setBody(String v) { body = v; }
        public DirectivePriority getPriority() { return priority; } public void setPriority(DirectivePriority v) { priority = v; }
    }
    public static class MessageRequest {
        private String body; public String getBody() { return body; } public void setBody(String v) { body = v; }
    }
    public static class StatusRequest {
        private DirectiveStatus status; public DirectiveStatus getStatus() { return status; } public void setStatus(DirectiveStatus v) { status = v; }
    }
    public static class DelegateResponse {
        public final String id, sessionId, username, displayName, title, organization, brief;
        public final Instant createdAt;
        public DelegateResponse(DelegateProfileEntity p, String username, String displayName) {
            id=p.getId(); sessionId=p.getSessionId(); this.username=username; this.displayName=displayName;
            title=p.getTitle(); organization=p.getOrganization(); brief=p.getBrief(); createdAt=p.getCreatedAt();
        }
    }
    public static class MessageResponse {
        public final String id, direction, body, authorName; public final Instant createdAt;
        public MessageResponse(DirectiveMessageEntity m, String authorName) {
            id=m.getId(); direction=m.getDirection().name(); body=m.getBody(); this.authorName=authorName; createdAt=m.getCreatedAt();
        }
    }
    public static class DirectiveResponse {
        public final String id, sessionId, delegateId, delegateName, title, body, priority, status, lastActionBy;
        public final Instant createdAt, updatedAt; public final List<MessageResponse> messages;
        public final List<EngineActionResponse> engineActions;
        public DirectiveResponse(DirectiveEntity d, String delegateName, String lastActionBy, List<MessageResponse> messages,
                                 List<EngineActionResponse> engineActions) {
            id=d.getId(); sessionId=d.getSessionId(); delegateId=d.getDelegateId(); this.delegateName=delegateName;
            title=d.getTitle(); body=d.getBody(); priority=d.getPriority().name(); status=d.getStatus().name();
            createdAt=d.getCreatedAt(); updatedAt=d.getUpdatedAt(); this.messages=messages;
            this.lastActionBy=lastActionBy;
            this.engineActions=engineActions;
        }
    }
    public static class EngineActionResponse {
        public final String id, actionType, authority, submittedBy, conditions;
        public final double scale, resourceCommitment; public final long activationTick, endTick; public final Instant createdAt;
        public EngineActionResponse(com.clec.economy.crisis.persistence.PolicyActionEntity action,String submittedBy){
            id=action.getId();actionType=action.getActionType().name();authority=action.getAuthority();scale=action.getScale();
            resourceCommitment=action.getResourceCommitment();activationTick=action.getActivationTick();endTick=action.getEndTick();
            conditions=action.getConditions();createdAt=action.getCreatedAt();this.submittedBy=submittedBy;
        }
    }
    public static class PublicSituationResponse {
        public final String sessionId, sessionName, status;
        public final long tick, simulationTimeMinutes; public final PublicIndicators publicIndicators;
        public PublicSituationResponse(com.clec.economy.crisis.api.SessionStateResponse session) {
            sessionId=session.getId(); sessionName=session.getName(); status=session.getStatus().name();
            tick=session.getState().getTick(); simulationTimeMinutes=session.getState().getSimulationTimeMinutes();
            publicIndicators=session.getState().getPublicIndicators();
        }
    }
}
