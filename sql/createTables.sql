DROP TABLE IF EXISTS pastes;

CREATE TABLE pastes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(60),
  content TEXT,
  time TIMESTAMP WITH TIME ZONE DEFAULT now()
  )


CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT,
  FOREIGN KEY (post_id) REFERENCES pastes(id),
  comment VARCHAR(140),
  time TIMESTAMP WITH TIME ZONE DEFAULT now()
)