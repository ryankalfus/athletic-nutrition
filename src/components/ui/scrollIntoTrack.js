// Scroll a sideways chip track so `item` is fully in view, moving only the
// track. Element.scrollIntoView() would also move the browser's sequential
// focus starting point, so the first Tab on a fresh load would skip the skip
// link (A11Y-01).
export function scrollIntoTrack(track, item) {
  if (!track || !item) return;
  const box = track.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  if (rect.left < box.left) track.scrollLeft -= box.left - rect.left;
  else if (rect.right > box.right) track.scrollLeft += rect.right - box.right;
}
