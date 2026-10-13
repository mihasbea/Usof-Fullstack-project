INSERT IGNORE INTO users (id, login, password, full_name, email, email_confirmed, role) VALUES
(1, 'mmykhalchenko', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Mariia Mykhalchenko', 'mmykhalchenko@test.com', TRUE, 'admin'),
(2, 'vshaforostova', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Viktoriia Shaforostova', 'vshaforostova@test.com', TRUE, 'user'),
(3, 'dburlachenko', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Daniil Burlachenko', 'dburlachenko@test.com', TRUE, 'user'),
(4, 'rferchuk', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Roman Ferchuk', 'rferchuk@test.com', TRUE, 'user'),
(5, 'amilshina', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Albina Milshina', 'amilshina@test.com', TRUE, 'user'),
(6, 'vkasatonov', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Владислав Касатонов', 'vkasatonov@test.com', TRUE, 'user');

INSERT IGNORE INTO blacklisted_tokens (id, token_hash, expires_at) VALUES
(1, '2dad9f8d2d145057ffab2d3529141f20e012455b3f1d856c3ac50677d268247c', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
(2, '03e7a3aed7fac07d3ef203c71ddb554b999e35b3f03de36a1756ccabb26af790', DATE_ADD(NOW(), INTERVAL 2 HOUR)),
(3, '50607ba1ed04a8c233bfcec1e707c0e70b5bcf0b8d1962b5c15a69b9e3bbd833', DATE_ADD(NOW(), INTERVAL 3 HOUR)),
(4, 'e6a32f89dee5a0d19f53544afc888fbeb55ac55e2a88d160e36b959d73603346', DATE_ADD(NOW(), INTERVAL 4 HOUR)),
(5, '7b252d714b857113ad6fd32067a5704078ebff9c3084f1ac8d11e3a2155cf494', DATE_ADD(NOW(), INTERVAL 5 HOUR));

INSERT IGNORE INTO categories (id, title, description) VALUES
(1, 'Backend Development', 'Questions about server-side logic, databases, APIs, application architecture (Node.js, PHP, Python, Java, Go, etc.)'),
(2, 'Frontend Development', 'Questions about client-side development, user interfaces, and web design (HTML, CSS, JavaScript, React, Angular, Vue.js, etc.)'),
(3, 'Mobile Development', 'Questions about mobile app development for iOS and Android platforms.'),
(4, 'DevOps', 'Questions about deployment, CI/CD pipelines, cloud services, and infrastructure management.'),
(5, 'Data Science', 'Questions about data analysis, machine learning, AI, and statistical modeling.'),
(6, 'Cybersecurity', 'Questions about security practices, vulnerabilities, encryption, and ethical hacking.'),
(7, 'Game Development', 'Questions about creating video games, game engines, graphics programming, and game design.'),
(8, 'Software Testing', 'Questions about testing methodologies, test automation, QA processes, and bug tracking.');

INSERT IGNORE INTO posts (id, author_id, title, content, status) VALUES
(1, 1, 'How to optimize SQL queries for better performance?', 'I have a large database and some of my SQL queries are running slow. What are some best practices for optimizing SQL queries to improve performance?', 'active'),
(2, 2, 'What is the difference between REST and GraphQL?', 'I am trying to understand the differences between REST and GraphQL APIs. Can someone explain the pros and cons of each approach?', 'active'),
(3, 3, 'How to implement JWT authentication in a Node.js application?', 'I am building a Node.js application and want to implement JWT authentication. Can someone provide a step-by-step guide or example code?', 'active'),
(4, 4, 'What are the best practices for responsive web design?', 'I want to make my website responsive and mobile-friendly. What are some best practices for responsive web design?', 'active'),
(5, 5, 'How to deploy a Django application on AWS?', 'I have developed a Django application and want to deploy it on AWS. What are the steps involved in deploying a Django app on AWS?', 'active');

INSERT IGNORE INTO post_attachments (id, post_id, file_path, file_type) VALUES
(1, 1, '/uploads/posts/seed-1.png', 'image'),
(2, 2, '/uploads/posts/seed-2.png', 'image'),
(3, 3, '/uploads/posts/seed-3.png', 'image'),
(4, 4, '/uploads/posts/seed-4.png', 'image'),
(5, 5, '/uploads/posts/seed-5.png', 'image');

INSERT IGNORE INTO post_categories (post_id, category_id) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 2),
(5, 1);

INSERT IGNORE INTO comments (id, post_id, author_id, content, status) VALUES
(1, 1, 2, 'You can use EXPLAIN to analyze your queries and identify bottlenecks. Also, consider indexing frequently queried columns.', 'active'),
(2, 1, 3, 'Make sure to avoid SELECT * and only retrieve the columns you need. This can significantly improve performance.', 'active'),
(3, 2, 4, 'REST is more traditional and widely used, while GraphQL allows clients to request exactly what they need. It can reduce over-fetching of data.', 'active'),
(4, 3, 5, 'You can use the jsonwebtoken library in Node.js to implement JWT authentication. Make sure to securely store your secret key.', 'active'),
(5, 4, 1, 'Use media queries and flexible grid layouts to ensure your website looks good on all devices. Test on multiple screen sizes.', 'active');

INSERT IGNORE INTO likes (id, author_id, type, target_type, post_id, comment_id) VALUES
(1, 2, 'like', 'post', 1, NULL),
(2, 3, 'like', 'post', 1, NULL),
(3, 4, 'dislike', 'post', 2, NULL),
(4, 5, 'like', 'comment', NULL, 1),
(5, 1, 'dislike', 'comment', NULL, 2);

INSERT IGNORE INTO favorites (user_id, post_id) VALUES
(2, 1),
(3, 1),
(4, 2),
(5, 3),
(1, 4);

INSERT IGNORE INTO post_subscriptions (user_id, post_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5),
(2, 1),
(3, 1),
(4, 2),
(5, 3),
(1, 4);

INSERT IGNORE INTO category_subscriptions (user_id, category_id) VALUES
(2, 1),
(3, 1),
(4, 2),
(5, 3),
(1, 4);

INSERT IGNORE INTO notifications (id, user_id, post_id, type, message, data, is_read) VALUES
(1, 1, 1, 'category_deleted', 'The category "Web Performance" was deleted from your post "How to optimize SQL queries for better performance?". Add another category so more people can find it. Suggested categories: Data Science, DevOps, Software Testing.', '{"deleted_category":{"id":101,"title":"Web Performance"},"post":{"id":1,"title":"How to optimize SQL queries for better performance?"},"remaining_categories":[{"id":1,"title":"Backend Development"}],"suggested_categories":[{"id":5,"title":"Data Science"},{"id":4,"title":"DevOps"},{"id":8,"title":"Software Testing"}]}', TRUE),
(2, 2, 2, 'category_deleted', 'The category "API Design" was deleted from your post "What is the difference between REST and GraphQL?". Add another category so more people can find it. Suggested categories: Frontend Development, Mobile Development, DevOps.', '{"deleted_category":{"id":102,"title":"API Design"},"post":{"id":2,"title":"What is the difference between REST and GraphQL?"},"remaining_categories":[{"id":1,"title":"Backend Development"}],"suggested_categories":[{"id":2,"title":"Frontend Development"},{"id":3,"title":"Mobile Development"},{"id":4,"title":"DevOps"}]}', FALSE),
(3, 3, 3, 'category_deleted', 'The category "Authentication" was deleted from your post "How to implement JWT authentication in a Node.js application?". Add another category so more people can find it. Suggested categories: Cybersecurity, Frontend Development, DevOps.', '{"deleted_category":{"id":103,"title":"Authentication"},"post":{"id":3,"title":"How to implement JWT authentication in a Node.js application?"},"remaining_categories":[{"id":1,"title":"Backend Development"}],"suggested_categories":[{"id":6,"title":"Cybersecurity"},{"id":2,"title":"Frontend Development"},{"id":4,"title":"DevOps"}]}', FALSE),
(4, 4, 4, 'category_deleted', 'The category "UI/UX Design" was deleted from your post "What are the best practices for responsive web design?". Add another category so more people can find it. Suggested categories: Mobile Development, Game Development, Backend Development.', '{"deleted_category":{"id":104,"title":"UI/UX Design"},"post":{"id":4,"title":"What are the best practices for responsive web design?"},"remaining_categories":[{"id":2,"title":"Frontend Development"}],"suggested_categories":[{"id":3,"title":"Mobile Development"},{"id":7,"title":"Game Development"},{"id":1,"title":"Backend Development"}]}', TRUE),
(5, 5, 5, 'category_deleted', 'The category "Cloud Hosting" was deleted from your post "How to deploy a Django application on AWS?". Add another category so more people can find it. Suggested categories: DevOps, Cybersecurity, Data Science.', '{"deleted_category":{"id":105,"title":"Cloud Hosting"},"post":{"id":5,"title":"How to deploy a Django application on AWS?"},"remaining_categories":[{"id":1,"title":"Backend Development"}],"suggested_categories":[{"id":4,"title":"DevOps"},{"id":6,"title":"Cybersecurity"},{"id":5,"title":"Data Science"}]}', FALSE);

INSERT IGNORE INTO users (id, login, password, full_name, email, email_confirmed, role) VALUES
(7, 'unconfirmed', '$2b$10$vH12hSRZRsG9FDh4ev.M1e30t.42fqIU4S2bb03gexZLcN46krdXG', 'Unconfirmed User', 'unconfirmed@test.com', FALSE, 'user');

INSERT IGNORE INTO posts (id, author_id, title, content, status) VALUES
(6, 2, 'Hidden post for the moderation demo', 'This post is inactive: only its author and admins can see it.', 'inactive');

INSERT IGNORE INTO comments (id, post_id, author_id, content, status) VALUES
(6, 1, 4, 'Inactive comment for the moderation demo.', 'inactive');

INSERT IGNORE INTO post_categories (post_id, category_id) VALUES (3, 6), (5, 4), (6, 1);

UPDATE users u
SET rating = (
    SELECT COALESCE(SUM(IF(l.type = 'like', 1, -1)), 0)
    FROM likes l
    LEFT JOIN posts p ON l.post_id = p.id
    LEFT JOIN comments c ON l.comment_id = c.id
    WHERE p.author_id = u.id OR c.author_id = u.id
);
