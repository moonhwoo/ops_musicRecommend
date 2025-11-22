
INSERT INTO users (spotify_user_id, email, username) VALUES
('test_user_001', 'test1@example.com', '테스트1'),
('test_user_002', 'test2@example.com', '테스트2');


INSERT INTO user_preferences (user_id, novelty_score, preferred_year_category) VALUES
(1, 8, '2020s');

INSERT INTO user_favorite_genres (user_id, genre_id) VALUES
(1, 29),  
(1, 32),  
(1, 30);  

INSERT INTO user_favorite_artists (user_id, artist_spotify_id, artist_name, artist_rank) VALUES
(1, '3HqSLMAZ3g3d5poNaI7GOU', '아이유', 1),
(1, '3Nrfpe0tUJi4K4DXYWgMUX', 'BTS', 2),
(1, '6HvZYsbFfjnjFrWF950C9d', 'NewJeans', 3);


INSERT INTO user_preferences (user_id, novelty_score, preferred_year_category) VALUES
(2, 3, '1990s');


INSERT INTO user_favorite_genres (user_id, genre_id) VALUES
(2, 34), 
(2, 33),  
(2, 35); 


INSERT INTO user_favorite_artists (user_id, artist_spotify_id, artist_name, artist_rank) VALUES
(2, '7jFUYMpMUBDL4JQtMZ5ilc', '성시경', 1),
(2, '6GwM5CHqhWXzG3l5kzRSAS', '윤하', 2),
(2, NULL, 'YUI', 3);  

INSERT INTO play_history (user_id, song_spotify_id) VALUES
(1, '3n3Ppam7vgaVa1iaRUc9Lp'),  
(1, '0tgVpDi06FyKpA1z0VMD4v'),  
(1, '5hVghJ4KaYES3BFUATCYn0'),  
(2, '5sdQOyqq2IDhvmx2lHOpwd'), 
(2, '1301WleyT98MSxVHPZCA6M'); 