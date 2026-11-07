CREATE TABLE requests (id TEXT PRIMARY KEY,email TEXT NOT NULL,sku TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'waiting',created_at INTEGER NOT NULL,notified_at INTEGER,provider_id TEXT,payload TEXT,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,lease_token TEXT,first_send INTEGER,last_error TEXT);
--> statement-breakpoint
CREATE UNIQUE INDEX unique_open_request ON requests(email,sku) WHERE status <> 'notified';
--> statement-breakpoint
CREATE INDEX queue_due ON requests(status,next_attempt,lease_until);
--> statement-breakpoint
CREATE TABLE events (event_id TEXT PRIMARY KEY,sku TEXT NOT NULL,quantity INTEGER NOT NULL,received_at INTEGER NOT NULL);
