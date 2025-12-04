// Utility to produce a sorted list of tags for rendering badge buttons.
export function getSortedTagList(tags = [], itemTags = [], locale = "th") {
  const list = (itemTags || []).map((id) => {
    const tag = tags.find((t) => String(t.tag_id) === String(id));
    return { id, name: tag ? tag.tag_name : id, found: !!tag };
  });
  list.sort((a, b) => String(a.name).localeCompare(String(b.name), locale));
  return list;
}
