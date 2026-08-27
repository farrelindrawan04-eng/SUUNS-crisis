package com.clec.economy.operations;

import javax.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "directive_messages")
public class DirectiveMessageEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "directive_id", nullable = false, length = 36) private String directiveId;
    @Column(name = "author_user_id", nullable = false, length = 36) private String authorUserId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private MessageDirection direction;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected DirectiveMessageEntity() { }
    public DirectiveMessageEntity(String id, String directiveId, String authorUserId,
                                  MessageDirection direction, String body, Instant createdAt) {
        this.id = id; this.directiveId = directiveId; this.authorUserId = authorUserId;
        this.direction = direction; this.body = body; this.createdAt = createdAt;
    }
    public String getId() { return id; }
    public String getDirectiveId() { return directiveId; }
    public String getAuthorUserId() { return authorUserId; }
    public MessageDirection getDirection() { return direction; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
