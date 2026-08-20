PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_path TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
, sub_count INTEGER NOT NULL DEFAULT 0);
INSERT INTO users VALUES(1,'badman369','badman369@gmail.com','$2b$12$ECnwzqT5oPP4.YvM4.77SuAhH/.fOxA50vs5XuT9l78y6EGDJ8jnC','Bad Man',NULL,NULL,'user',0,'2026-08-15 12:23:54','2026-08-15 12:23:54',1);
INSERT INTO users VALUES(2,'hridoy','user@example.com','$2b$12$1vewyrGv6R4x3k7jIsKDGeFEVbeQXfX/YTqI0XrrN3HOg6UVea0za','Hridoy',NULL,NULL,'user',0,'2026-08-18 11:35:56','2026-08-18 11:35:56',1);
CREATE TABLE videos (
    id TEXT PRIMARY KEY,

    user_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,

    video_path TEXT NOT NULL,
    thumbnail_path TEXT,

    original_filename TEXT,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,

    duration INTEGER,
    width INTEGER,
    height INTEGER,

    status TEXT NOT NULL DEFAULT 'processing',
    visibility TEXT NOT NULL DEFAULT 'public',

    views INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, category TEXT NOT NULL DEFAULT '', comments_count TEXT AFTER likes_count,

    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE video_activity (
    video_id TEXT PRIMARY KEY,

    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);
INSERT INTO video_activity VALUES('0819d5eb-0763-400c-843b-431d62770ae6',1,5,1);
INSERT INTO video_activity VALUES('f055845c-82a1-47f9-9dc4-69541492bc71',2,7,2);
INSERT INTO video_activity VALUES('1442e61e-1412-4a47-af34-a485bffdb29d',0,1,1);
INSERT INTO video_activity VALUES('e32f6bdc-1f2d-46df-9e88-01ecafbefe1c',0,0,2);
CREATE TABLE video_comments (
    id TEXT PRIMARY KEY,

    video_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,

    comment TEXT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,

    FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE video_likes (
    video_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (video_id, user_id),

    FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE video_views (
    video_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (video_id, user_id),

    FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE user_interest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    video_id TEXT NOT NULL,

    activity_type TEXT NOT NULL
        CHECK (
            activity_type IN (
                'view',
                'like',
                'unlike',
                'comment',
                'comment_delete'
            )
        ),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (video_id)
        REFERENCES videos(id)
        ON DELETE CASCADE
);
INSERT INTO user_interest VALUES(1,1,'0819d5eb-0763-400c-843b-431d62770ae6','like','2026-08-18 10:42:41');
INSERT INTO user_interest VALUES(2,1,'0819d5eb-0763-400c-843b-431d62770ae6','comment','2026-08-18 10:44:23');
INSERT INTO user_interest VALUES(3,1,'0819d5eb-0763-400c-843b-431d62770ae6','comment','2026-08-18 10:44:26');
INSERT INTO user_interest VALUES(4,1,'0819d5eb-0763-400c-843b-431d62770ae6','comment','2026-08-18 10:44:35');
INSERT INTO user_interest VALUES(5,1,'f055845c-82a1-47f9-9dc4-69541492bc71','view','2026-08-18 10:51:53');
INSERT INTO user_interest VALUES(6,1,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 10:55:07');
INSERT INTO user_interest VALUES(7,1,'f055845c-82a1-47f9-9dc4-69541492bc71','unlike','2026-08-18 10:55:27');
INSERT INTO user_interest VALUES(8,1,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 10:55:48');
INSERT INTO user_interest VALUES(9,1,'f055845c-82a1-47f9-9dc4-69541492bc71','unlike','2026-08-18 10:56:07');
INSERT INTO user_interest VALUES(10,1,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 10:56:13');
INSERT INTO user_interest VALUES(11,1,'f055845c-82a1-47f9-9dc4-69541492bc71','unlike','2026-08-18 11:01:02');
INSERT INTO user_interest VALUES(12,1,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 11:01:05');
INSERT INTO user_interest VALUES(13,1,'f055845c-82a1-47f9-9dc4-69541492bc71','unlike','2026-08-18 11:01:07');
INSERT INTO user_interest VALUES(14,1,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 11:01:08');
INSERT INTO user_interest VALUES(15,1,'1442e61e-1412-4a47-af34-a485bffdb29d','comment','2026-08-18 11:01:43');
INSERT INTO user_interest VALUES(16,1,'1442e61e-1412-4a47-af34-a485bffdb29d','comment','2026-08-18 11:01:54');
INSERT INTO user_interest VALUES(17,1,'1442e61e-1412-4a47-af34-a485bffdb29d','view','2026-08-18 11:02:22');
INSERT INTO user_interest VALUES(18,1,'1442e61e-1412-4a47-af34-a485bffdb29d','comment_delete','2026-08-18 11:03:13');
INSERT INTO user_interest VALUES(19,1,'e32f6bdc-1f2d-46df-9e88-01ecafbefe1c','view','2026-08-18 11:08:00');
INSERT INTO user_interest VALUES(20,2,'f055845c-82a1-47f9-9dc4-69541492bc71','view','2026-08-18 11:58:04');
INSERT INTO user_interest VALUES(21,2,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 11:58:17');
INSERT INTO user_interest VALUES(22,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:21');
INSERT INTO user_interest VALUES(23,2,'f055845c-82a1-47f9-9dc4-69541492bc71','unlike','2026-08-18 12:08:35');
INSERT INTO user_interest VALUES(24,2,'f055845c-82a1-47f9-9dc4-69541492bc71','like','2026-08-18 12:08:38');
INSERT INTO user_interest VALUES(25,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:50');
INSERT INTO user_interest VALUES(26,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:51');
INSERT INTO user_interest VALUES(27,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:51');
INSERT INTO user_interest VALUES(28,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:52');
INSERT INTO user_interest VALUES(29,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:52');
INSERT INTO user_interest VALUES(30,2,'f055845c-82a1-47f9-9dc4-69541492bc71','comment','2026-08-18 12:08:56');
INSERT INTO user_interest VALUES(31,2,'e32f6bdc-1f2d-46df-9e88-01ecafbefe1c','like','2026-08-18 12:09:44');
INSERT INTO user_interest VALUES(32,2,'e32f6bdc-1f2d-46df-9e88-01ecafbefe1c','unlike','2026-08-18 12:09:47');
INSERT INTO user_interest VALUES(33,2,'e32f6bdc-1f2d-46df-9e88-01ecafbefe1c','view','2026-08-20 16:48:30');
CREATE TABLE user_subscriptions (
    subscriber_id INTEGER NOT NULL,
    subscribed_to_id INTEGER NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (subscriber_id, subscribed_to_id),

    CHECK (subscriber_id != subscribed_to_id),

    FOREIGN KEY (subscriber_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (subscribed_to_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
INSERT INTO user_subscriptions VALUES(2,1,'2026-08-18 11:56:56');
INSERT INTO user_subscriptions VALUES(1,2,'2026-08-18 15:28:47');
INSERT INTO sqlite_sequence VALUES('users',2);
INSERT INTO sqlite_sequence VALUES('user_interest',33);
CREATE INDEX idx_videos_feed ON videos(
    user_id,
    status,
    visibility,
    created_at DESC,
    id DESC
);
CREATE INDEX idx_video_comments_video_id
ON video_comments(video_id);
CREATE INDEX idx_video_comments_user_id
ON video_comments(user_id);
CREATE INDEX idx_video_likes_user_id
ON video_likes(user_id);
CREATE INDEX idx_video_views_user_id
ON video_views(user_id);
CREATE INDEX idx_user_interest_user
ON user_interest(user_id);
CREATE INDEX idx_user_interest_video
ON user_interest(video_id);
CREATE INDEX idx_user_interest_type
ON user_interest(activity_type);
CREATE INDEX idx_user_interest_user_time
ON user_interest(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_subscriber
ON user_subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_subscribed_to
ON user_subscriptions(subscribed_to_id);
COMMIT;
