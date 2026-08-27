package com.clec.economy.feed;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PublicFeedCardRepository extends JpaRepository<PublicFeedCardEntity,String> {
    List<PublicFeedCardEntity> findBySessionIdOrderByUpdatedAtDesc(String sessionId);
    List<PublicFeedCardEntity> findBySessionIdAndStatusOrderByPublishedAtDesc(String sessionId,FeedCardStatus status);
}
