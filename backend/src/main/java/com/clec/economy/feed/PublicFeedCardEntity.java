package com.clec.economy.feed;

import javax.persistence.*;
import java.time.Instant;

@Entity @Table(name="public_feed_cards")
public class PublicFeedCardEntity {
    @Id @Column(length=36) private String id;
    @Column(name="session_id",nullable=false,length=36) private String sessionId;
    @Column(nullable=false,length=180) private String headline;
    @Column(nullable=false,columnDefinition="TEXT") private String summary;
    @Column(nullable=false,length=40) private String category;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private FeedSeverity severity;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private FeedCardStatus status;
    @Column(name="created_by",nullable=false,length=36) private String createdBy;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="published_at") private Instant publishedAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    @Column(name="updated_by",length=36) private String updatedBy;
    protected PublicFeedCardEntity() { }
    public PublicFeedCardEntity(String id,String sessionId,String headline,String summary,String category,FeedSeverity severity,String createdBy,Instant now){
        this.id=id;this.sessionId=sessionId;this.headline=headline;this.summary=summary;this.category=category;
        this.severity=severity;this.status=FeedCardStatus.DRAFT;this.createdBy=createdBy;this.createdAt=now;this.updatedAt=now;
    }
    public void update(String headline,String summary,String category,FeedSeverity severity,FeedCardStatus status,String actorId,Instant now){
        this.headline=headline;this.summary=summary;this.category=category;this.severity=severity;
        if(status==FeedCardStatus.PUBLISHED&&this.status!=FeedCardStatus.PUBLISHED)this.publishedAt=now;
        this.status=status;this.updatedBy=actorId;this.updatedAt=now;
    }
    public String getId(){return id;} public String getSessionId(){return sessionId;} public String getHeadline(){return headline;}
    public String getSummary(){return summary;} public String getCategory(){return category;} public FeedSeverity getSeverity(){return severity;}
    public FeedCardStatus getStatus(){return status;} public String getCreatedBy(){return createdBy;} public Instant getCreatedAt(){return createdAt;}
    public Instant getPublishedAt(){return publishedAt;} public Instant getUpdatedAt(){return updatedAt;}
    public String getUpdatedBy(){return updatedBy;}
}
