package com.clec.economy.feed;
import java.time.Instant;
public final class FeedDtos {
    private FeedDtos(){}
    public static class CardRequest {
        private String headline,summary,category; private FeedSeverity severity; private FeedCardStatus status;
        public String getHeadline(){return headline;} public void setHeadline(String v){headline=v;}
        public String getSummary(){return summary;} public void setSummary(String v){summary=v;}
        public String getCategory(){return category;} public void setCategory(String v){category=v;}
        public FeedSeverity getSeverity(){return severity;} public void setSeverity(FeedSeverity v){severity=v;}
        public FeedCardStatus getStatus(){return status;} public void setStatus(FeedCardStatus v){status=v;}
    }
    public static class CardResponse {
        public final String id,sessionId,headline,summary,category,severity,status,authorName,updatedByName;
        public final Instant createdAt,publishedAt,updatedAt;
        public CardResponse(PublicFeedCardEntity c,String authorName,String updatedByName){id=c.getId();sessionId=c.getSessionId();headline=c.getHeadline();summary=c.getSummary();category=c.getCategory();severity=c.getSeverity().name();status=c.getStatus().name();this.authorName=authorName;this.updatedByName=updatedByName;createdAt=c.getCreatedAt();publishedAt=c.getPublishedAt();updatedAt=c.getUpdatedAt();}
    }
}
