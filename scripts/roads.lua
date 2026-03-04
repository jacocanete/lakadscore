local roads = osm2pgsql.define_way_table('roads', {
    { column = 'name', type = 'text' },
    { column = 'highway', type = 'text', not_null = true },
    { column = 'geom', type = 'linestring', projection = 4326 },
})

function osm2pgsql.process_way(object)
    local highway = object.tags.highway
    if not highway then return end

    local dominated = {
        motorway = true,
        trunk = true,
        primary = true,
        secondary = true,
        tertiary = true,
        motorway_link = true,
        trunk_link = true,
        primary_link = true,
        secondary_link = true,
        tertiary_link = true,
    }

    if not dominated[highway] then return end

    roads:insert({
        name = object.tags.name,
        highway = highway,
        geom = object:as_linestring(),
    })
end
