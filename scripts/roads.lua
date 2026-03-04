local roads = osm2pgsql.define_way_table('roads', {
    { column = 'name', type = 'text' },
    { column = 'highway', type = 'text', not_null = true },
    { column = 'cycleway', type = 'text' },
    { column = 'bicycle', type = 'text' },
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
        residential = true,
        unclassified = true,
        living_street = true,
        motorway_link = true,
        trunk_link = true,
        primary_link = true,
        secondary_link = true,
        tertiary_link = true,
        cycleway = true,
        path = true,
    }

    if not dominated[highway] then return end

    -- For paths, only include if bicycle access
    if highway == 'path' then
        local bicycle = object.tags.bicycle
        if bicycle ~= 'yes' and bicycle ~= 'designated' then
            return
        end
    end

    roads:insert({
        name = object.tags.name,
        highway = highway,
        cycleway = object.tags.cycleway or object.tags['cycleway:left'] or object.tags['cycleway:right'] or object.tags['cycleway:both'],
        bicycle = object.tags.bicycle,
        geom = object:as_linestring(),
    })
end
