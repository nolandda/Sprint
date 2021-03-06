from __future__ import division

from rorn.Box import SuccessBox, ErrorBox, InfoBox
from rorn.ResponseWriter import ResponseWriter

from Prefs import Prefs
from Privilege import requirePriv
from Task import statuses, statusMenu
from Table import LRTable
from Button import Button
from Event import Event
from resetpw import printResetForm
from sprints import tabs as sprintTabs
from tasks import tabs as taskTabs
from utils import *

backlogStyles = ['emphasize', 'show', 'dim', 'hide']
messageTypes = [('sprintMembership', "Added to a sprint"), ('taskAssigned', "Assigned a task"), ('noteRelated', "Someone added a note on a task you own or have a note on"), ('noteMention', "Mentioned in a note"), ('priv', "Granted a privilege")]

@get('prefs')
def prefs(handler):
	handler.title('Preferences')
	requirePriv(handler, 'User')

	prefs = handler.session['user'].getPrefs()
	print "<script src=\"/static/prefs.js\" type=\"text/javascript\"></script>"
	print InfoBox('', id = 'post-status', close = True)
	print "<form method=\"post\" action=\"/prefs\">"

	print InfoBox("Note", "Your password and avatar are controlled from <a href=\"/users/%s\">your profile</a>" % handler.session['user'].username)

	print "<a name=\"default-sprint-tab\"></a>"
	print "<h3>Default Sprint Tab</h3>"
	print "Which tab you're taken to when following links in the project list:<br><br>"
	print "<select name=\"default_sprint_tab\">"
	for tab in sprintTabs().group('').values():
		print "<option value=\"%s\"%s>%s</option>" % (tab.name, ' selected' if tab.name == prefs.defaultSprintTab else '', tab.getDisplayName())
	print "</select>"

	print "<a name=\"default-tasks-tab\"></a>"
	print "<h3>Default Tasks Tab</h3>"
	print "Which tab you're taken to when adding a new backlog task:<br><br>"
	print "<select name=\"default_tasks_tab\">"
	for tab in taskTabs.group('').values():
		print "<option value=\"%s\"%s>%s</option>" % (tab.name, ' selected' if tab.name == prefs.defaultTasksTab else '', tab.getDisplayName())
	print "</select>"

	print "<h3>Backlog Style</h3>"
	print "How each task on the backlog is styled, based on status:<br><br>"
	select = ResponseWriter()
	print "<select name=\"backlog_style[%s]\">"
	for name in backlogStyles:
		print "<option value=\"%s\">%s</option>" % (name, name.title())
	print "</select>"
	select = select.done()

	tbl = LRTable()
	for statusBlock in statusMenu:
		for name in statusBlock:
			val = prefs.backlogStyles[name]
			tbl[statuses[name].text] = (select % name).replace("<option value=\"%s\">" % val, "<option value=\"%s\" selected>" % val)
	print tbl

	print "<h3>Messages</h3>"
	print "Which events will automatically notify you via system message:<br><br>"
	for name, desc in messageTypes:
		print "<input type=\"checkbox\" name=\"messages[%s]\" id=\"messages[%s]\"%s><label for=\"messages[%s]\">%s</label><br>" % (name, name, ' checked' if prefs.messages[name] else '', name, desc)

	print "<br>"
	print Button('Save', id = 'save-button', type = 'button').positive()
	print "</form>"

@post('prefs')
def prefsPost(handler, p_default_sprint_tab, p_default_tasks_tab, p_backlog_style, p_messages = []):
	def die(msg):
		print msg
		done()

	handler.wrappers = False

	if not handler.session['user']:
		die("You must be logged in to modify preferences")
	if p_default_sprint_tab not in sprintTabs():
		die("Unrecognized default sprint tab <b>%s</b>" % stripTags(p_default_sprint_tab))
	if p_default_tasks_tab not in taskTabs:
		die("Unrecognized default task tab <b>%s</b>" % stripTags(p_default_tasks_tab))
	if set(p_backlog_style.keys()) != set(name for block in statusMenu for name in block):
		die("Backlog style key mismatch")
	if not set(p_messages.keys()) <= set(name for name, desc in messageTypes):
		die("Message type mismatch")

	prefs = handler.session['user'].getPrefs()
	prefs.defaultSprintTab = p_default_sprint_tab
	prefs.defaultTasksTab = p_default_tasks_tab
	prefs.backlogStyles = p_backlog_style
	prefs.messages = dict((name, name in p_messages.keys()) for name, desc in messageTypes)
	prefs.save()

	handler.responseCode = 299
	print "Saved changes"
	Event.prefs(handler)

@get('prefs/backlog.less')
def prefsStyle(handler):
	handler.wrappers = False
	handler.log = False
	handler.contentType = 'text/css'
	if not handler.session['user']: return
	prefs = handler.session['user'].getPrefs()

	for (status, style) in prefs.backlogStyles.iteritems():
		print "@pref_%s: %s;" % (status.replace(' ', '_'), style)
