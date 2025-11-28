CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    novelty_score TINYINT NOT NULL CHECK (novelty_score BETWEEN 0 AND 10),
    preferred_year_category VARCHAR(20) DEFAULT NULL, -- ex: '1990s', '2000s', 'ALL'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE user_favorite_genres (
    user_id INT NOT NULL,
    genre_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, genre_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE user_favorite_artists (
    user_id INT NOT NULL,
    artist_spotify_id VARCHAR(100),
    artist_name VARCHAR(255) NOT NULL,
    artist_rank TINYINT NOT NULL CHECK (artist_rank BETWEEN 1 AND 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, artist_rank),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);