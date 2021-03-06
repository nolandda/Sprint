$(document).ready(function() {
	TaskTable.on_task_change(function(e, task, field, value) {
		save_task(task.attr('taskid'), field, value, 0);
	});
	TaskTable.on_list_change(function(e) {
		apply_filters();
	});
	TaskTable.on_group_move(function(e, group, new_seq) {
		save_task(group.attr('groupid'), 'groupmove', new_seq, 0);
	});

	setup_search();
	setup_filter_buttons();
	setup_indexes();
	setup_warnings();
	$('#post-status').hide();
});

function update_task_count() {
    var vis = $('#all-tasks .task:visible');
    var assigned = $.makeArray($('#filter-assigned .selected').map(function() {return $(this).attr('assigned');}));
    var status = $.makeArray($('#filter-status .selected').map(function() {return $(this).attr('status');}));

	// Update search field
	idx = searchTokens.indexOf(true);
	tokens = searchTokens.slice(0, idx);
	if(status.length > 0) {tokens.push('status:' + status.map(function(val) {return val.replace(' ', '-');}).join(','));}
	if(assigned.length > 0) {tokens.push('assigned:' + assigned.join(','));}
	tokens = tokens.concat(searchTokens.slice(idx + 1));
	$('#search').val(tokens.join(' '));

	// Update search description
	idx = searchDescriptions.indexOf(true);
	descriptions = searchDescriptions.slice(0, idx);
    if(status.length > 0) {descriptions.push(status.join(' or '));}
    if(assigned.length > 0) {descriptions.push('assigned to ' + assigned.join(' or '));}
	descriptions = descriptions.concat(searchDescriptions.slice(idx + 1));

    txt = 'Showing ' + vis.length + ' of ' + totalTasks + (totalTasks == 1 ? ' task' : ' tasks');
	url = '/sprints/' + sprintid;
	if(descriptions.length > 0) {
		$('.save-search').attr('href', '/search/saved/new?sprintid=' + sprintid + '&query=' + encodeURIComponent(tokens.join(' ')));
		$('.save-search, .cancel-search').css('display', 'inline');
		txt += ' ' + descriptions.join(', ');
		url += '?search=' + encodeURIComponent(tokens.join(' '));
	} else {
		$('.save-search, .cancel-search').css('display', 'none');
	}
    $('#task-count').text(txt);

	history.replaceState(null, null, url);
}

function setup_search() {
	$('input#search').keydown(function(e) {
		if(e.keyCode == 13) {
			document.location = '/sprints/' + sprintid + '?search=' + encodeURIComponent($(this).val());
		}
	});
}

function setup_filter_buttons() {
	$.each(['#filter-assigned', '#filter-status'], function(_, selector) {
		$(selector + ' a:gt(0)').click(function(e) {
			if(e.ctrlKey) {
				$(this).toggleClass('selected');
			} else {
				$(selector + ' a').removeClass('selected');
				$(this).addClass('selected');
			}

			apply_filters();
			return false;
		});

		$(selector + ' a:first').click(function(e) {
			$(selector + ' a').removeClass('selected');
			apply_filters();
			return false;
		});
	});
}

function setup_indexes() {
	$('tr.task .task-index').click(function(e) {
		task = $(this).parents('tr.task');
		task.toggleClass('selected');

		if(e.shiftKey) {
			$('tr.task:visible').toggleClass('selected', task.hasClass('selected'));
		} else if(e.ctrlKey) {
			group_id = task.attr('groupid');
			group_tasks = $('tr.task[groupid=' + group_id + ']:visible');
			group_tasks.toggleClass('selected', task.hasClass('selected'));
		}

		selected = $('tr.task.selected');
		box = $('#selected-task-box');
		if(selected.length > 0) {
			$('span', box).text(selected.length + (selected.length == 1 ? ' task' : ' tasks') + ' selected');
			box.slideDown('fast');
		} else {
			box.slideUp('fast');
		}
	});

	$('#selected-task-box #selected-history').click(function(e) {
		ids = $('tr.task.selected').map(function() {return $(this).attr('taskid');});
		idStr = $.makeArray(ids).join();
		if(e.button == 1 || e.ctrlKey) {
			window.open('/tasks/' + idStr);
		} else {
			document.location = '/tasks/' + idStr;
		}
		$('#selected-task-box #selected-cancel').click();
		e.preventDefault();
	});

	$('#selected-task-box #selected-highlight').click(function(e) {
		ids = $('tr.task.selected').map(function() {return $(this).attr('taskid');});
		idStr = $.makeArray(ids).join();
		if(e.button == 1 || e.ctrlKey) {
			window.open('?search=highlight:' + idStr);
		} else {
			document.location.search = 'search=highlight:' + idStr;
		}
		$('#selected-task-box #selected-cancel').click();
		e.preventDefault();
	});

	$('#selected-task-box #selected-edit').click(function(e) {
		ids = $('tr.task.selected').map(function() {return $(this).attr('taskid');});
		idStr = $.makeArray(ids).join();
		if(e.button == 1 || e.ctrlKey) {
			window.open('/tasks/' + idStr + '/edit');
		} else {
			document.location = '/tasks/' + idStr + '/edit';
		}
		$('#selected-task-box #selected-cancel').click();
		e.preventDefault();
	});

	$('#selected-task-box #selected-cancel').click(function() {
		$('tr.task.selected .task-index').click();
	});

	TaskTable.update_indexes();
}

function setup_warnings() {
	$('#sprint-warnings .header').click(function() {
		box = $('#sprint-warnings');
		box.toggleClass('expanded');
		if(box.hasClass('expanded')) {
			$('.header img', box).attr('src', '/static/images/collapse.png');
			$('ul', box).show();
		} else {
			$('.header img', box).attr('src', '/static/images/expand.png');
			$('ul', box).hide();
		}
	});
}

function apply_filters() {
	assigned = $('#filter-assigned a.selected');
	statuses = $('#filter-status a.selected');
	groups = $('tr.group');
	tasks = $('tr.task');

	groups.show();
	tasks.show();

	if(assigned.length > 0) {
		$('#filter-assigned a:not(.selected)').each(function() {
			tasks.filter('[assigned="' + $(this).attr('assigned') + '"]').hide();
		});

		// Special-case many-assigned tasks; hide if all of the assignees are unselected
		tasks.filter('[assigned*=" "]').each(function() {
			task_assigned = $(this).attr('assigned').split(' ');
			for(i in task_assigned) {
				if($('#filter-assigned a[assigned=' + task_assigned[i] + ']').hasClass('selected')) {
					return;
				}
			}
			$(this).hide();
		});
	}

	if(statuses.length > 0) {
		$('#filter-status a:not(.selected)').each(function() {
			tasks.filter('[status="' + $(this).attr('status') + '"]').hide();
		});
	}

	$('tr.group img[src="/static/images/expand.png"]').each(function(e) {
		groupid=$(this).parents('tr').attr('groupid');
		$('tr.task[groupid=' + groupid + ']').hide();
	});

	if(assigned.length > 0 || statuses.length > 0) {
		// Hide non-fixed groups with no tasks
		groups.each(function() {
			seek = $(this);
			if(seek.hasClass('fixed')) {
				return;
			}
			while(seek = seek.next()) {
				if(seek.is('.task:visible')) {
					return;
				} else if(seek.length == 0 || seek.hasClass('group')) {
					$(this).hide();
					return;
				}
			}
		});
	}

	// Set the new task assignee parameters
	qs_assigned = $.makeArray(assigned.map(function() {return $(this).attr('assigned');})).join(' ');
	$('a[href^="/tasks/new"]').each(function() {
		qs = $.deparam.querystring($(this).attr('href'));
		qs['assigned'] = qs_assigned;
		$(this).attr('href', $.param.querystring('/tasks/new', qs));
		return;
	});

	update_task_count();
	TaskTable.update_indexes();
}

function save_error(text, fatal) {
	if(fatal === undefined) {fatal = true;}
	noty({type: fatal ? 'error' : 'warning', text: text})
}

savingMutex = false;
function save_task(id, field, value, counter) {
	task = (field == 'groupmove') ? $() : $('tr.task[taskid=' + id + ']');
	icon = $('.saving', task);
	revid = task.attr('revid') || 0;

	console.log("Saving change to " + id + "(" + revid + "): " + field + " <- " + value + " (attempt " + counter + ")");
	icon.css('visibility', 'visible');

	if(savingMutex) {
		if(counter == 10) {
			save_error("Timed out trying to set task " + id + " " + field + " to " + value);
			icon.css('visibility', 'hidden');
		} else {
			setTimeout(function() {save_task(id, field, value, counter + 1);}, 200);
		}
		return;
	}

	savingMutex = true;
	$.post("/sprints/" + sprintid, {'id': id, 'rev_id': revid, 'field': field, 'value': value}, function(data, text, request) {
		switch(request.status) {
		case 200:
			save_error(data)
			break;
		case 298:
			save_error(data, false);
			break;
		case 299:
			if(field != 'groupmove') {
				rev = parseInt(data, 10);
				task.attr('revid', rev).addClass('changed-today');
				console.log("Changed saved; new revision is " + rev);
			}
			break;
		default:
			save_error("Unexpected response code " + request.status)
			break;
		}

		icon.css('visibility', 'hidden');
		savingMutex = false;
	});
}

SprintWS.on_open(function() {
	SprintWS.send({subscribe: ['backlog#' + sprintid]});
});

SprintWS.on_message(asdf = function(e, data) {
	console.log(data);
	switch(data['channel']) {
	case 'backlog#' + sprintid:
		switch(data['type']) {
		case 'new':
			//TODO
			break;
		case 'update':
			task = $('tr.task[taskid=' + data['id'] + ']');
			if(task.length == 0) {
				return;
			}
			task.attr('revid', data['revision']);

			popup_anchor = null;
			switch(data['field']) {
			case 'status':
				TaskTable.set_status(task, data['value'], false);
				popup_anchor = $('.status', task);
				break;
			case 'name':
				TaskTable.set_name(task, data['value'], false);
				popup_anchor = $('.name', task);
				break;
			case 'goal':
				TaskTable.set_goal(task, data['value'], false);
				popup_anchor = $('.goal', task);
				break;
			case 'assigned':
				TaskTable.set_assigned(task, data['value'], false);
				popup_anchor = $('.assigned', task);
				break;
			case 'hours':
				TaskTable.set_hours(task, data['value'], false);
				popup_anchor = $('.hours:last input', task);
				break;
			case 'deleted':
				//TODO
				break;
			case 'taskmove':
				//TODO
				break;
			case 'groupmove':
				//TODO
				break;
			}

			if(popup_anchor != null && data['description'] != null && data['creator'] != currentUser) {
				// off = popup_anchor.offset();
				offLeft = popup_anchor.offset().left;
				offTop = ((popup_anchor.prop('tagName') == 'TD') ? popup_anchor : popup_anchor.parents('td')).offset().top;
				popup = $('<div>').html(data['description']).addClass('task-update-alert');
				$('body').append(popup);
				popup.offset({top: offTop - popup.height() - 25, left: offLeft - 22});
				task.append(popup);
				setTimeout((function() {
					var popup_copy = popup; // closure
					return function() {
						popup_copy.fadeOut();
					}
				})(), 3000);
			}
		}
		apply_filters();
		break;
	}
});
