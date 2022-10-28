/*
version: 0.0.1
source, docs & updates: https://github.com/fkuersch/obsidian-import-yinote

docs:

install:
templater: enable js?!
dataview

oembed parameters: depending on provider, see: https://oembed.com/#section2.3
cmd+alt+i -> dev console

moment.js format: https://momentjs.com/docs/#/displaying/format/

*/

// todo: test with different sources (twitter, vimeo, twitch)
// todo: test without oembed (custom web site)
// todo: recognize existing notes by yinote_id frontmatter
// todo: save image only if it is used in md
// todo: conditional note image (based on custom keywords, screenshot noimage yesimage)
// todo: use moustache & oembed in file title
// todo: option to filter by provider: only_provider
// todo: remove todos
// todo: log levels
// todo: docs

const LOGLEVEL_SILENT = 0;
const LOGLEVEL_WARNING = 1;
const LOGLEVEL_ERROR = 2;
const LOGLEVEL_INFO = 3;
const LOGLEVEL_DEBUG = 4;
let CURRENT_LOG_LEVEL = LOGLEVEL_INFO;


async function import_yinote(
        tp,
        note_template_path = "scripts/yinote_template.md",
        title_template = "{{title}} - {{provider}}",
        save_images_to_directory = "assets/yinote", // todo null/false
        yinote_id_frontmatter_key = "yinote_id",
        custom_created_date_format = "L LT",
        delete_json = true,
        delete_permanently = false,
        delete_only_if_all_imported = false,
        oembed_registry_path = "scripts/oembed_registry.json",
        oembed_registry_cache_days = 7,
        loglevel = LOGLEVEL_DEBUG) { // todo: info

    try {
        CURRENT_LOG_LEVEL = loglevel;
        const yinote_link = find_json_link_in_md_content(tp.file.content);
        const yinote_path = get_path_for_link(yinote_link, tp);
        log(`importing '${yinote_path}'`);
        const yinote_json = await get_json_for_path(yinote_path);
        compose_title_for_all_notes(title_template, yinote_json);
        await remove_already_imported_yinotes(yinote_json, yinote_id_frontmatter_key);

        if(!yinote_json.data.length) {
            log("all notes already imported");
            show_obsidian_notification(tp, `There are no new notes in\n'${yinote_path}'`);
        } else {
            sort_yinotes_by_created_timestamp_desc(yinote_json);
            const yinote = await let_user_select_note(tp, yinote_json);
            log(`user selected '${yinote.meta.title}'`);
            populate_yinote_with_created_time(yinote, custom_created_date_format);
            populate_yinote_with_timestamps(yinote);
            const template = await get_template_from_file(note_template_path);
            if(template.includes("{{#oembed}}")) {
                await populate_yinote_with_oembed_data(yinote, tp, oembed_registry_path, oembed_registry_cache_days);
            }
            if(save_images_to_directory) {
                await save_all_images_to_directory(tp, yinote, save_images_to_directory);
            }
            log("yinote is ready for being inserted into the template:");
            log(yinote, LOGLEVEL_INFO, true);
            const md_content = populate_moustachelike_template(template, yinote);
            await write_content(md_content, tp);
            await rename_md_file(yinote, tp);
        }
        if(delete_json && (!delete_only_if_all_imported || yinote_json.data.length <= 1)) {
            await delete_file(yinote_path, delete_permanently);
        }
    } catch(e) {
        log(e, LOGLEVEL_ERROR);
        show_obsidian_notification(tp, e);
        return;
    }
}

function log(msg, level = LOGLEVEL_INFO, raw = false) {
    if(level > CURRENT_LOG_LEVEL) {
        return;
    }
    if (raw) {
        console.log(msg);
        return;
    }
    const time = moment().format("HH:mm:ss.SSS");
    console.log(`${time} import_yinote [${get_loglevel_str(level)}]: ${msg}`);
}

function get_loglevel_str(level) {
    const level_str = ["SILENT", "WARNING", "ERROR", "INFO", "DEBUG"];
    return level_str[level];
}

function show_obsidian_notification(tp, msg) {
    new tp.obsidian.Notice(msg);
}

function find_json_link_in_md_content(content) {
    const regex = /\!\[\[(.*\.json)\]\]/gm;
    const m = [...content.matchAll(regex)];
    if(m.length < 1) {
        throw "Could not find an embedded json file.\n\nPlease drag-and-drop your YiNote JSON archive into a new note.";
    } else if(m.length > 1) {
        throw `Only one embedded JSON per file is permitted (found ${m.length}).\n\nPlease remove all but one embedded JSON file.`;
    }
    return m[0][1];
}

function get_path_for_link(link, tp) {
    const linkPath = app.metadataCache.getFirstLinkpathDest(link, "");
    if(!linkPath || linkPath.deleted || linkPath.saving) {
        throw `Unable to find file at\n'${link}'`;
    }
    const path = tp.obsidian.normalizePath(linkPath.path);
    return path;
}

async function get_json_for_path(path) {
    const j = await app.vault.readJson(path);
    if(!j) {
        throw `Unable to parse JSON at\n'${link}'.`;
    }
    return j;
}

function compose_title_for_all_notes(title_template, j) {
    for(let yinote of j.data) {
        yinote.file_title = compose_title(title_template, yinote);
    }
}

function compose_title(title_template, yinote) {
    let new_title = title_template;
    for(const [key, value] of Object.entries(yinote.meta)) {
        new_title = new_title.replaceAll(`{{${key}}}`, value);
    }
    new_title = sanitize_file_title(new_title);
    return new_title;
}

function sanitize_file_title(title) {
    let sanitized_title = title;
    sanitized_title = sanitized_title.replaceAll("\\", "-");
    sanitized_title = sanitized_title.replaceAll("/", "-");
    sanitized_title = sanitized_title.replaceAll(":", "-");
    return sanitized_title;
}

async function remove_already_imported_yinotes(yinote_json, yinote_id_frontmatter_key) {
    let i = yinote_json.data.length;
    while (i--) {
        if(await note_exists(yinote_id_frontmatter_key, yinote_json.data[i].id)) {
            log(`already imported: '${yinote_json.data[i].meta.title}'`, LOGLEVEL_DEBUG);
            yinote_json.data.splice(i, 1);
        }
    }
}

async function note_exists(yinote_id_frontmatter_key, yinote_id) {
    if(!is_dataview_installed()) {
        return false;
    }
    let pages_with_matching_yinote_id = await app.plugins.plugins.dataview.api.pages()
        .where(p => p[yinote_id_frontmatter_key] == yinote_id);
    return !!pages_with_matching_yinote_id.length;
}

function is_dataview_installed() {
    return !!app.plugins.plugins.dataview;
}

function sort_yinotes_by_created_timestamp_desc(j) {
    j.data.sort(function(a, b){return b.createdAt - a.createdAt});
}

async function let_user_select_note(tp, j) {
    return tp.system.suggester(
        (item) => `"${item.meta.title}" on ${item.meta.provider} (${moment(item.createdAt).fromNow()})`, 
        j.data, true, "");
}

async function get_template_from_file(template_path) {
    return await app.vault.adapter.read(template_path);
}

async function populate_yinote_with_oembed_data(yinote, tp, oembed_registry_path, oembed_registry_cache_days) {
    log("downloading oembed metadata");
    const oembed_url = await get_oembed_url_for_yinote(yinote, tp, oembed_registry_path, oembed_registry_cache_days);
    const oembed_data = await download_json(oembed_url, tp);
    yinote.oembed = oembed_data;
}

async function get_oembed_url_for_yinote(yinote, tp, oembed_registry_path, oembed_registry_cache_days) {
    // oembed docs strongly encourages using the discovery instead of the registry:
    // https://oembed.com/#section7
    // However, composing the url from a locally cached registry is way faster (100x)
    // than fetching and parsing the web page every time. That makes a noticable difference,
    // so we default to using the registry and use discovery as a fallback.
    await download_oembed_registry_if_required(tp, oembed_registry_path, oembed_registry_cache_days);
    const url_from_registry = await create_oembed_url_from_registry(yinote, tp, oembed_registry_path);
    if(url_from_registry) {
        log(`got oembed url from registry: ${url_from_registry}`, LOGLEVEL_DEBUG);
        return url_from_registry;
    }
    
    log("starting oembed discovery", LOGLEVEL_DEBUG);
    const discovered_url = await get_oembed_url_from_discovery(yinote, tp);
    if(discovered_url) {
        log(`got oembed url from discovery: ${discovered_url}`, LOGLEVEL_DEBUG);
        return discovered_url;
    }

    log("no oembed url found");
    return null;
}

async function get_oembed_url_from_discovery(yinote, tp) {
    // https://oembed.com/#section4
    // find a <link rel="alternate" type="application/json+oembed" ...
    const response = await tp.obsidian.request({
        url: yinote.meta.url,
        throw: true
    });

    var doc = new DOMParser().parseFromString(response, "text/html");
    const xpath = "string(//link[@rel='alternate' and @type='application/json+oembed']/@href)"
    var url = doc.evaluate(xpath, doc, null, XPathResult.STRING_TYPE, null).stringValue;
    return url;
}

async function download_oembed_registry_if_required(tp, oembed_registry_path, oembed_registry_cache_days) {
    const stat = await app.vault.adapter.stat(oembed_registry_path);

    const exists = stat !== null
    if(exists) {
        const now_timestamp = (+ new Date());
        const moment_last_updated = moment(stat.mtime);
        moment_last_updated.locale('en');
        log(`oembed registry last updated: ${moment_last_updated.fromNow()}`, LOGLEVEL_DEBUG);
        log(`cache time for oembed registry: ${oembed_registry_cache_days} days`, LOGLEVEL_DEBUG);
        const cache_days_ago_timestamp = now_timestamp - oembed_registry_cache_days * 24 * 3600;
        if(stat.mtime >= cache_days_ago_timestamp) {
            log("oembed registry update not required", LOGLEVEL_DEBUG);
            return;
        }
    }

    log("updating oembed registry");
    const response = await tp.obsidian.request({
        url: "https://oembed.com/providers.json",
        contentType: "application/json",
        throw: true
    });
    JSON.parse(response); // throws exception if not valid JSON
    await app.vault.adapter.write(oembed_registry_path, response);
}

async function create_oembed_url_from_registry(yinote, tp, oembed_registry_path) {
    const oembed_registry = await get_json_for_path(oembed_registry_path);
    const provider = find_oembed_provider(oembed_registry, yinote.meta.provider);
    const endpoint = find_oembed_endpoint(provider, yinote.meta.url);
    const endpoint_url = endpoint.url.replaceAll("{format}", "json");
    const full_url = endpoint_url + "?" + new URLSearchParams({
        format: "json",
        url: yinote.meta.url
    });
    return full_url;
}

function find_oembed_provider(oembed_registry, provider_name) {
    for(const provider of oembed_registry) {
        if(provider.provider_name == provider_name) {
            return provider;
        }
    }
    throw `provider '${provider_name}' not found in oembed registry`;
}

function find_oembed_endpoint(provider, url) {
    for(const endpoint of provider.endpoints) {
        for(const scheme of endpoint.schemes) {
            const scheme_regex = new RegExp("^" + scheme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll("\\*", ".*") + "$");
            if(url.search(scheme_regex) == 0) {
                return endpoint;
            }
        }
    }
    throw `no oembed endpoint with matching scheme for provider '${provider.provider_name}' and url '${url}' found`;
}

async function download_json(json_url, tp) {
    const json = await tp.obsidian.requestUrl({
        url: json_url,
        contentType: "application/json",
        throw: true
    }).json;
    return json;
}

async function save_all_images_to_directory(tp, yinote, download_dir) {
    log(`saving images to '${download_dir}'`);
    await save_images_for_all_notes(tp, yinote, download_dir);
    await save_images_for_meta(tp, yinote, download_dir);
    await save_images_for_oembed(tp, yinote, download_dir);
}

async function save_images_for_all_notes(tp, yinote, download_dir) {
    let promises = [];
    for(const [i, note] of yinote.notes.entries()) {
        const key = "image";
        const filename = `yinote_${yinote.id}_note_${i}`;
        promises.push(provide_local_url_copy_in_obj_for_key(tp, note, key, filename, download_dir));
    }
    await Promise.all(promises);
}

async function save_images_for_meta(tp, yinote, download_dir) {
    const key = "image";
    const filename = `yinote_${yinote.id}_meta_image`;
    await provide_local_url_copy_in_obj_for_key(tp, yinote.meta, key, filename, download_dir);
}

async function save_images_for_oembed(tp, yinote, download_dir) {
    const key = "thumbnail_url";
    const filename = `yinote_${yinote.id}_oembed_thumbnail`;
    await provide_local_url_copy_in_obj_for_key(tp, yinote.oembed, key, filename, download_dir);
}

async function provide_local_url_copy_in_obj_for_key(tp, obj, key, filename, download_dir) {
    // todo: bad name
    if(obj === undefined) {
        return;
    }
    const url = obj[key];
    const normalized_path = await save_image_to_directory(tp, url, filename, download_dir);
    obj[`${key}_local`] = normalized_path;
    log(`saved: ${normalized_path}`, LOGLEVEL_DEBUG);
}

async function save_image_to_directory(tp, url, filename_without_ext, download_dir) {
    if(url.indexOf("data") === 0) {
        return await save_data_url_to_directory(tp, url, filename_without_ext, download_dir);
    } else if(url.indexOf("http") === 0) {
        return await download_image(tp, url, filename_without_ext, download_dir);
    }
    return null;
}

async function save_data_url_to_directory(tp, data_url, filename_without_ext, download_dir) {
    const file_extension = get_file_extension_from_data_url(data_url);
    const filename = `${filename_without_ext}.${file_extension}`;
    const response = await fetch(data_url);
    if (!response.ok) {
        throw `error while downloading image: ${response.status}`;
    }
    const array_buffer = await response.arrayBuffer();
    return await write_arraybuffer_to_disk(tp, array_buffer, download_dir, filename);
}

function get_file_extension_from_data_url(url) {
    const ext_regex = RegExp(/^data:image\/([a-z0-9]+);base64,.*/i);
    return get_file_extension_by_regex(ext_regex, url);
}

async function download_image(tp, url, filename_without_ext, download_dir) {
    log(`downloading image: ${url}`);
    const file_extension = get_file_extension_from_http_url(url);
    const filename = `${filename_without_ext}.${file_extension}`;
    const response = await tp.obsidian.requestUrl({
        url: url,
        throw: true
    });
    const array_buffer = response.arrayBuffer;
    return await write_arraybuffer_to_disk(tp, array_buffer, download_dir, filename);
}

function get_file_extension_from_http_url(url) {
    const ext_regex = RegExp(/^http[s]?:\/\/.*\.([a-z0-9]{1,10})$/i)
    return get_file_extension_by_regex(ext_regex, url);
}

function get_file_extension_by_regex(ext_regex, url) {
    if(!ext_regex.test(url)) {
        log(`unable to extract image type from url: ${url}`, LOGLEVEL_ERROR);
        throw "unable to extract image type from url";
    }
    const file_extension = ext_regex.exec(url)[1];
    return file_extension;
}

async function write_arraybuffer_to_disk(tp, array_buffer, download_dir, filename) {
    const normalized_path = tp.obsidian.normalizePath(`${download_dir}/${filename}`);
    await app.vault.adapter.writeBinary(normalized_path, array_buffer);
    return normalized_path;
}

function populate_moustachelike_template(template, yinote) {
    return populate_section(template, yinote);
}

function populate_section(template, input_obj) {
    if (input_obj === undefined) {
        return "";
    }
    let section, keyword, section_start, section_end;
    while (([section, keyword, section_start, section_end] = get_next_section(template) || []).length) {
        let populated_section = "";
        if(Array.isArray(input_obj[keyword])) {
            for(const arr_val of input_obj[keyword]) {
                populated_section += populate_section(section, arr_val)
            }
        } else {
            populated_section = populate_section(section, input_obj[keyword])
        }
        template = replace_substring(template, section_start, section_end, populated_section);
    }
    for(const [key, value] of Object.entries(input_obj)) {
        template = template.replaceAll(`{{${key}}}`, value);
    }
    return template;
}

function get_next_section(template) {
    const section_start = template.indexOf("{{#")
    if(section_start < 0) {
        return null;
    }
    const keyword_end = template.indexOf("}}", section_start);
    if(keyword_end < 0) {
        throw `expected '}}' for closing the section tag`;
    }
    const keyword_start = section_start + 3;
    const section_keyword = template.substring(keyword_start, keyword_end);
    
    // Note: This simple approach of finding the matching closing tag does not work 
    // if there are nested sections with the same name, ie. trying to get
    // meta.something.meta.name with a the template 
    // {{#meta}}{{#something}}{{#meta}}{{name}}{{/meta}}{{/something}}{{/meta}}
    // would not work because it would find this --^ tag as closing tag for the first #meta tag.
    // Luckily, in our case there are no nested tags with the same name (hopefully).
    const section_inner_start = keyword_end + 2;
    const section_closing_tag = `{{/${section_keyword}}}`
    const section_closing_tag_start = template.indexOf(section_closing_tag, section_inner_start);
    if(section_closing_tag_start < 0) {
        throw `no section closing tag '${section_closing_tag}' found`;
    }
    const section_inner_end = section_closing_tag_start;
    const section_end = section_closing_tag_start + section_closing_tag.length;
    const section_inner = template.substring(section_inner_start, section_inner_end);
    return [section_inner, section_keyword, section_start, section_end];
}

function replace_substring(original, start, end, replacement) {
    return original.substring(0, start) + replacement + original.substring(end, original.length);
}

function populate_yinote_with_created_time(yinote, format) {
    yinote.createdAt_date = moment(yinote.createdAt).format("YYYY-MM-DD");
    yinote.createdAt_utc_isostring = moment(yinote.createdAt).toISOString();
    yinote.createdAt_customformat = moment(yinote.createdAt).format(format);
}

function populate_yinote_with_timestamps(yinote) {
    for(const singlenote of yinote.notes) {
        singlenote.timestampurl = get_timestamp_url(yinote, singlenote);
        singlenote.time = hhmmss(singlenote.timestamp);
    }
}

function get_timestamp_url(yinote, singlenote) {
    let url = yinote.meta.url;
    switch(yinote.meta.provider.toLowerCase()) {
        case "vimeo":
        case "youtube":
        default:
            url += `#t=${singlenote.timestamp}`;
    }
    return url;
}

function pad(num) {
    return ("0"+num).slice(-2);
}

function hhmmss(secs) {
    // based on https://stackoverflow.com/a/31340408
    var minutes = Math.floor(secs / 60);
    secs = secs%60;
    var hours = Math.floor(minutes/60)
    minutes = minutes%60;
    const hours_str = hours > 0 ? `${pad(hours)}:` : "";
    return `${hours_str}${pad(minutes)}:${pad(secs)}`;
}

async function write_content(content, tp) {
    const md_path = tp.obsidian.normalizePath(tp.file.path(true));
    log(`writing content to '${md_path}'`);
    await app.vault.adapter.write(md_path, content);
}

async function rename_md_file(yinote, tp) {
    try {
        await tp.file.rename(yinote.file_title);
        log(`file renamed to '${yinote.file_title}.md'`);
    } catch(e) {
        log(`unable to rename file to '${yinote.file_title}.md'`, LOGLEVEL_ERROR);
        throw `Unable to rename the note:\n\n${e}`
    }
}

async function delete_file(path, delete_permanently) {
    const abstractFile = await app.vault.getAbstractFileByPath(path);
    if(delete_permanently) {
        await app.vault.delete(abstractFile);
        log(`permanently deleted: '${path}'`);
    } else {
        await app.vault.trash(abstractFile);
        log(`moved to trash: '${path}'`);
    }
}

module.exports = import_yinote;
