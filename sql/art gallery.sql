use Digital_art_gallery;


CREATE TABLE registration (
    userid INT AUTO_INCREMENT PRIMARY KEY,  -- userid as auto-increment integer primary key
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE profile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    userid int ,
    user_image BLOB,  
    phone_number VARCHAR(15) UNIQUE,
    FOREIGN KEY (userid) REFERENCES registration(userid) ON DELETE CASCADE
);

select * from registration;



CREATE TABLE Artworks (
    artwork_id INT AUTO_INCREMENT PRIMARY KEY,
    artwork_name VARCHAR(255) NOT NULL,
    artwork_image BLOB,
    price DECIMAL(10, 2) NOT NULL,
    about_artwork TEXT,
    userid INT,
    FOREIGN KEY (userid) REFERENCES registration(userid)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


select * from Artworks;

ALTER TABLE Artworks MODIFY artwork_image LONGBLOB;


DELIMITER //

CREATE FUNCTION GetArtworksByUser(userId INT)
RETURNS JSON
DETERMINISTIC
BEGIN
    DECLARE result JSON;

    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'artwork_id', artwork_id,
            'artwork_name', artwork_name,
            'price', price,
            'about_artwork', about_artwork
        )
    ) INTO result
    FROM Artworks
    WHERE userid = userId;

    RETURN result;
END//

DELIMITER ;

-- ALTER TABLE registration
-- ADD COLUMN user_type VARCHAR(20) DEFAULT 'user';


-- ALTER TABLE artist
-- ADD COLUMN user_type VARCHAR(20) DEFAULT 'artist';


-- DROP TABLE IF EXISTS registration;-- 

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






