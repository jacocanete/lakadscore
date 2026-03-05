local amenities = osm2pgsql.define_node_table('amenities', {
    { column = 'name', type = 'text' },
    { column = 'category', type = 'text', not_null = true },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'point', projection = 4326 },
})

-- Maps OSM tags to our scoring categories
-- grocery: grocery_store, supermarket
-- restaurant: restaurant
-- school: school, primary_school, secondary_school, university
-- healthcare: hospital, medical_clinic, doctor
-- pharmacy: pharmacy, drugstore
-- finance: bank, atm
-- convenience: convenience_store
-- park: park, playground
-- worship: church, mosque, temple

local amenity_map = {
    restaurant = 'restaurant',
    hospital = 'healthcare',
    clinic = 'healthcare',
    doctors = 'healthcare',
    pharmacy = 'pharmacy',
    bank = 'finance',
    atm = 'finance',
    school = 'school',
    university = 'school',
    college = 'school',
    place_of_worship = 'worship',
}

local shop_map = {
    supermarket = 'grocery',
    grocery = 'grocery',
    greengrocer = 'grocery',
    convenience = 'convenience',
    chemist = 'pharmacy',
}

local leisure_map = {
    park = 'park',
    playground = 'park',
    garden = 'park',
}

function osm2pgsql.process_node(object)
    local tags = object.tags
    local name = tags.name
    local category = nil
    local subcategory = nil

    local amenity = tags.amenity
    if amenity and amenity_map[amenity] then
        category = amenity_map[amenity]
        subcategory = amenity
    end

    local shop = tags.shop
    if not category and shop and shop_map[shop] then
        category = shop_map[shop]
        subcategory = shop
    end

    local leisure = tags.leisure
    if not category and leisure and leisure_map[leisure] then
        category = leisure_map[leisure]
        subcategory = leisure
    end

    if not category then return end

    amenities:insert({
        name = name,
        category = category,
        subcategory = subcategory,
        geom = object:as_point(),
    })
end

-- Also capture amenities mapped as areas (closed ways) using centroid
local amenity_areas = osm2pgsql.define_way_table('amenity_areas_tmp', {
    { column = 'name', type = 'text' },
    { column = 'category', type = 'text', not_null = true },
    { column = 'subcategory', type = 'text' },
    { column = 'geom', type = 'polygon', projection = 4326 },
})

function osm2pgsql.process_way(object)
    if not object.is_closed then return end

    local tags = object.tags
    local name = tags.name
    local category = nil
    local subcategory = nil

    local amenity = tags.amenity
    if amenity and amenity_map[amenity] then
        category = amenity_map[amenity]
        subcategory = amenity
    end

    local shop = tags.shop
    if not category and shop and shop_map[shop] then
        category = shop_map[shop]
        subcategory = shop
    end

    local leisure = tags.leisure
    if not category and leisure and leisure_map[leisure] then
        category = leisure_map[leisure]
        subcategory = leisure
    end

    if not category then return end

    amenity_areas:insert({
        name = name,
        category = category,
        subcategory = subcategory,
        geom = object:as_polygon(),
    })
end
