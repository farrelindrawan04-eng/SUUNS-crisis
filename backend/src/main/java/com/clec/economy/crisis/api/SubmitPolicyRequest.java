package com.clec.economy.crisis.api;

import com.clec.economy.crisis.domain.PolicyActionType;

public class SubmitPolicyRequest {
    private PolicyActionType actionType;
    private String authority;
    private double scale = 1.0;
    private double resourceCommitment;
    private double credibility = 1.0;
    private double coverage = 1.0;
    private int implementationDelay;
    private int duration = 1;
    private String conditions;
    private String sourceDirectiveId;

    public PolicyActionType getActionType() { return actionType; }
    public void setActionType(PolicyActionType actionType) { this.actionType = actionType; }
    public String getAuthority() { return authority; }
    public void setAuthority(String authority) { this.authority = authority; }
    public double getScale() { return scale; }
    public void setScale(double scale) { this.scale = scale; }
    public double getResourceCommitment() { return resourceCommitment; }
    public void setResourceCommitment(double resourceCommitment) { this.resourceCommitment = resourceCommitment; }
    public double getCredibility() { return credibility; }
    public void setCredibility(double credibility) { this.credibility = credibility; }
    public double getCoverage() { return coverage; }
    public void setCoverage(double coverage) { this.coverage = coverage; }
    public int getImplementationDelay() { return implementationDelay; }
    public void setImplementationDelay(int implementationDelay) { this.implementationDelay = implementationDelay; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public String getSourceDirectiveId() { return sourceDirectiveId; }
    public void setSourceDirectiveId(String sourceDirectiveId) { this.sourceDirectiveId = sourceDirectiveId; }
}
