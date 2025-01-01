function toggleSection(sectionId) {
	document.querySelectorAll('main section').forEach(section => {
		section.classList.add('d-none');
	});
	document.getElementById(sectionId).classList.remove('d-none');
}
