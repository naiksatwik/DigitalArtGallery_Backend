use Digital_art_gallery;


CREATE TABLE registration (
    userid INT AUTO_INCREMENT PRIMARY KEY,  -- userid as auto-increment integer primary key
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);


CREATE TABLE profile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    userid INT,
    user_image LONGBLOB, -- Change from VARCHAR(255) to LONGBLOB
    phone_number VARCHAR(15),
    FOREIGN KEY (userid) REFERENCES registration(userid) ON DELETE CASCADE
);


select * from profile;




select * from Artworks;

DESCRIBE Artworks;


select  * from artist;

ALTER TABLE registration
ADD COLUMN user_type VARCHAR(20) DEFAULT 'user';


ALTER TABLE artist
ADD COLUMN user_type VARCHAR(20) DEFAULT 'artist';

CREATE TABLE ArtworkSummary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_artworks INT DEFAULT 0
);



select * from registration;


CREATE TABLE Artworks (
    artwork_id INT AUTO_INCREMENT PRIMARY KEY,
    artwork_name VARCHAR(255) NOT NULL,
    artwork_image LONGBLOB,
    price DECIMAL(10, 2) NOT NULL,
    about_artwork TEXT,
    userid INT,
    FOREIGN KEY (userid) REFERENCES registration(userid) ON DELETE CASCADE
);


DELIMITER //

DELIMITER //
CREATE FUNCTION GetArtworksByUserId(user_id INT)
RETURNS JSON
DETERMINISTIC
BEGIN
    DECLARE artwork_json JSON;

    -- Aggregate artworks into a JSON array
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'artwork_id', artwork_id,
            'artwork_name', artwork_name,
            'artwork_image', artwork_image,
            'price', price,
            'about_artwork', about_artwork,
            'user_id', user_id
        )
    ) INTO artwork_json
    FROM Artworks
    WHERE userid = user_id;

    -- Return an empty JSON array if no artworks are found
    IF artwork_json IS NULL THEN
        SET artwork_json = JSON_ARRAY();
    END IF;

    RETURN artwork_json;
END //
DELIMITER ;



SELECT GetArtworksByUserId(1) AS user_artworks;


-- DROP TABLE IF EXISTS registration;-- 
 -- DROP FUNCTION  GetArtworksByUserId;


-- Insert data into the registration table
-- INSERT INTO registration (username, email, password) VALUES
-- ('JohnDoe', 'johndoe@example.com', 'password123'),
-- ('JaneSmith', 'janesmith@example.com', 'password456'),
-- ('AliceBrown', 'alicebrown@example.com', 'password789');


-- -- Insert data into the profile table, using the userid from registration
-- INSERT INTO profile (userid, user_image, phone_number) VALUES
-- (1, LOAD_FILE('path/to/johndoe.jpg'), '123-456-7890'),
-- (2, LOAD_FILE('path/to/janesmith.jpg'), '987-654-3210'),
-- (3, LOAD_FILE('path/to/alicebrown.jpg'), '555-555-5555');


-- Step 1: Delete data from the dependent table (profile) first
-- TRUNCATE TABLE profile;

-- -- Step 2: Delete data from the main table (registration)
-- TRUNCATE TABLE registration;

-- -- Step 3: Reset auto-increment counters (if needed)
-- ALTER TABLE registration AUTO_INCREMENT = 1;
-- ALTER TABLE profile AUTO_INCREMENT = 1;





DELIMITER $$

CREATE TRIGGER after_artwork_insert
AFTER INSERT ON Artworks
FOR EACH ROW
BEGIN
    UPDATE ArtworkSummary
    SET total_artworks = (
        SELECT COUNT(*) FROM Artworks
    )
    WHERE id = 1;
END$$

DELIMITER ;


DELIMITER $$

CREATE TRIGGER after_artwork_delete
AFTER DELETE ON Artworks
FOR EACH ROW
BEGIN
    UPDATE ArtworkSummary
    SET total_artworks = (
        SELECT COUNT(*) FROM Artworks
    )
    WHERE id = 1;
END$$

DELIMITER ;

