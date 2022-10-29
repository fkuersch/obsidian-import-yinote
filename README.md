# obsidian-import-yinote
Import a [YiNote](https://github.com/shuowu/yi-note) into [Obsidian](https://obsidian.md) using [Templater](https://github.com/SilentVoid13/Templater) and [DataView](https://github.com/blacksmithgu/obsidian-dataview)

## Features

- Use your own markdown template for importing your YiNotes
- Use [oembed](https://oembed.com) metadata in your template
- Save attached images to your vault
- Only attach images with certain keywords appearing in the note

## Setup

### Requirements

1. Install [Templater](https://github.com/SilentVoid13/Templater)
2. Install [DataView](https://github.com/blacksmithgu/obsidian-dataview) (optional, used for identifying already imported notes)

### Install importer script

1. Copy `import_yinote.js` into your `scripts` folder*
2. Copy `yinote_template.md` into your `scripts` folder*
3. Copy `Import YiNote.md` into your `templates` folder*

*Your folders may have different names. Check your Templater settings (`Template folder location` and `Script files folder location`) and adjust accordingly. You also need to adjust some config options (see below for details).

## Importing your first note

1. In your browser, open a new tab, click the YiNote icon and go to `Settings`
2. Click the `Export`button next to`Export all data in JSON format` and save the JSON file
3. In Obsidian, create a new empty note. You don't need to set a title, the file will be renamed automatically
4. Drag-and-drop the YiNote JSON file into the new note. The file will be automatically imported into your vault and linked in the new note
5. Using Templater, insert the template `Import YiNote` (shortcut: `CTRL+T` or `CMD+T`) // todo: verify shortcut
6. Select a note from the list
7. The importer script will now
   1. replace the content of the Obsidian note with the content of the selected YiNote using the template in `yinote_template.md`,
   2. download metadata using [oembed](https://oembed.com),
   3. download and save attached images,
   4. rename the note,
   5. move the JSON file in your vault to the trash.

## Configuration

### In my Templater settings, `Script files folder location` is not called `scripts`

If that's the case, you need to adjust the following config options:

- `default_template_path`
- `oembed_registry_path`

See below on [how to set the options](#all-configuration-options).

### Creating your own note template

The template used for creating the notes (found in `yinote_template.md`) uses a syntax derived from [Mustache](https://mustache.github.io).

To find the values that are available for utilization in your custom template, I recommend opening the developer console in Obsidian (`CTRL+SHIFT+I` or `CMD+ALT+I`) and importing a YiNote like documented above. In the console, you'll find a line `yinote is ready for being inserted into the template:`followed by the object that's being used in the template.

![devconsole_example](docs/devconsole_example.png)

### Template examples

For example, if you want to insert the `meta.title`into your note, you'd write the following line in your template:

```markdown
{{#meta}}{{title}}{{/meta}}
```

For the `oembed.author_name`, you'd write:

```markdown
{{#oembed}}{{author_name}}{{/oembed}}
```

> Note: If the `oembed`key is not available, the whole section will be removed.

For the individual timestamped `notes`, you could write:

```markdown
{{#notes}}
### {{time}}
{{content}}
{{/notes}}
```

> Note: Since `notes`is a list, this block will be repeated for each object of the list.

### Using different templates based on the provider (YouTube, Twitch, Vimeo, Twitter, ...)

Depending on the provider, your demands on the template may vary. The metadata that's available to your template certainly will. You can set different template paths based on the provider in your `Import YiNote.md` like so:

```javascript
<%* tp.user.import_yinote({
	tp: tp,
	default_template_path: "scripts/yinote_template.md",
	note_template_path_by_provider: {
		"YouTube": "scripts/yinote_template_youtube.md",
		"Vimeo": "scripts/yinote_template_vimeo.md"
	}
}) _%>
```

In this example, there's a custom template for YouTube and Vimeo. All other providers will use the default template at `yinote_template.md`.

### Saving images to disk

YiNote creates still frames for all of your timestamped notes. Those images are available in `notes[].image` (not showing the full mustache-like syntax for brevity) in base64 encoded form. It is possible, but **highly discouraged** to embed those base64 encoded images directly in your note, since your plain text file can easily bloat to up to several megabytes in size. Instead, you should use the `_local`version of the image in your template, ie.  `notes[].image_local`. This way, the attached images will be saved to disk.

> Note: By default, the images will be saved to your vault's root directory. You can change the location by adjusting the `images_directory` option accordingly (see the table below).

> Note 2: Image URLs will be automatically downloaded if the local version is used in your template, ie. For `meta.image_local` or `oembed.thumbnail_url_local`.

### Only attach image if there's a keyword in the note

You may only want to attach a still frame for particular timestamped notes. You can do so by writing one of the keywords into your note, ie. `screenshot`or `still frame`.

> Note: You can view and adjust the list of keywords using the `conditional_image_keywords` option, see the table below.

If there's one of the keywords present in your note, a `notes[].conditional_image` object will be created like so:

![conditional_image_example](docs/conditional_image_example.png)

In your template, embedding a frame only if there's a keyword present, could look like this:

```markdown
{{#notes}}
### {{time}}
{{#conditional_image}}![frame]({{image_local}}){{/conditional_image}}
{{content}}
{{/notes}}
```

> Note: If you want to attach images by default but treat the keyword list as a blacklist (for removing the image for particular notes), you can do so by setting the `conditional_image_keywords_is_blacklist`option to `true` (see table below). You may also want to adjust your  `conditional_image_keywords` list to `["noimage", "noscreenshot"]` or alike.

### Ingore already imported notes

The script can use DataView and a value in your [front matter block](https://help.obsidian.md/Advanced+topics/YAML+front+matter) of your notes to find and ignore already existing notes. For this to work, [DataView](https://github.com/blacksmithgu/obsidian-dataview) must be installed and there must be the following lines in the top of your template files:

```yaml
---
yinote_id: {{id}}
---
```

> Note: You can change the name of the key (`yinote_id`) using the `yinote_id_frontmatter_key`config option (see table below).

### All configuration options

Your `Import YiNote.md` is the place to configure the importer script. It will look like this:

```javascript
<%* tp.user.import_yinote({
	tp: tp,
	<key>: <value>
}) _%>
```

For `<key>` and `<value>` there are the following options:

| key                                     | value example                                                | Description                                                  |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| tp                                      | tp                                                           | (required) This is the templater instance and must always be included |
| default_template_path                   | "my_scripts_folder/default_yinote_template.md"               | The path of your default template. You only need to change this if your Templater scripts folder is not called `scripts` or if you rename `yinote_template.md`<br />Default: `"scripts/yinote_template.md"` |
| note_template_path_by_provider          | {<br/>		"YouTube": "scripts/yinote_template_youtube.md",<br/>		"Vimeo": "scripts/yinote_template_vimeo.md"<br/>	} | A 'list' of different templates based on the provider (see above for details).<br />Default: `{}` |
| title_template                          | "{{#meta}}{{provider}} - {{/meta}}{{#oembed}}{{author_name}} - {{/oembed}}{{#meta}}{{title}}{{/meta}}" | The template to use for the new file name. This follows the same syntax as the templates.<br />Default: see left |
| make_images_available_offline           | false                                                        | In your template, you can use the `_local`version of an image to make the image available offline. When setting this option to `false`, you disable this feature completely.<br />Default: `true` |
| images_directory                        | "resources/yinote"                                           | Save the attached images to this directory in your vault (directory must exist).<br />Default: `""`(your vault's root directory) |
| conditional_image_keywords              | ["screenshot", "screen shot", "freeze frame", "still frame", "saveimage"] | When any of this keywords appear in your note, create a `conditional_image`object (see above for details)<br />Default: see left |
| conditional_image_keywords_is_blacklist | true                                                         | Treat the keyword list above as a blacklist. A `conditional_image`object will be created by default but omitted if there's a keyword present.<br />Default: `false` |
| yinote_id_frontmatter_key               | "my_custom_yinote_id"                                        | Search for this key in the frontmatter section of other notes for identifying already imported YiNotes (see above for details).<br />Default: `yinote_id` |
| custom_created_date_format              | "YYYY-MM"                                                    | Create a `createdAt_customformat` string using this [moment.js format](https://momentjs.com/docs/#/displaying/format/).<br />Default: `"L LT"` |
| delete_json                             | false                                                        | Delete the drag-and-dropped JSON file after import?<br />Default: `true` |
| delete_permanently                      | true                                                         | Delete the JSON permanently (otherwise it will be moved to trash)? Only available, if `delete_json`is `true`.<br />Default: `false` |
| delete_only_if_all_imported             | true                                                         | Delete the JSON only if all notes are imported? May come handy if you use scripts to further automate the import.<br />Default: `false` |
| oembed_registry_path                    | "my_scripts_folder/oembed_registry.json"                     | Cache the oembed registry at this path. You only need to change this if your Templater scripts folder is not called `scripts.`<br />Default: `"scripts/oembed_registry.json"` |
| oembed_registry_cache_days              | 3                                                            | Cache the oembed registry for this amount of days.<br />Default: `7` |
| loglevel                                | 4                                                            | Increase/decrease the amount of messages logged to the developer console:<br />0: Silent<br />1: Error<br />2: Warning<br />3: Info<br />4: Debug<br />Default: `3` |



---

## Contributing

For bug reports, ideas for improvement or questions please open an issue. I'm also happy to receive pull requests if it doesn't contain breaking changes. It may also be favorable to discuss an issue before implementing anything mayor.
