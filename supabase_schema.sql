-- Disasters table
CREATE TABLE IF NOT EXISTS disasters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    description TEXT,
    tags TEXT[],
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    audit_trail JSONB
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cache table
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_idx ON disasters(owner_id);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS reports_disaster_idx ON reports(disaster_id);

-- RPC function for geospatial query
CREATE OR REPLACE FUNCTION find_resources_near(
    lat double precision,
    lon double precision,
    distance_km double precision
)
RETURNS SETOF resources AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM resources
    WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326),
        distance_km * 1000 -- Convert km to meters
    );
END;
$$ LANGUAGE plpgsql; 