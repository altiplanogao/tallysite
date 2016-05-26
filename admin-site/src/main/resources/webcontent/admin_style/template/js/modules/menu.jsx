/**
 * Created by Gao Yuan on 2016/3/27.
 */
define(["jquery", "underscore", "i18n!nls/menutext"],
  function ($, _, menutext) {
    var React = require('react');
    var ReactDOM = require('react-dom');
    var MenuEntry = React.createClass({
      getInitialState: function () {
        var entry = this.props.entry;
        var entryActive = this.props.groupActive && (this.props.menuPath[1] == entry.key);
        return {active: entryActive};
      },
      render: function () {
        var entry = this.props.entry;
        var className = this.state.active ? 'active' : '';
        return (<li className={className}><a href={entry.url}>{menutext[entry.name]}</a></li>);
      }
    });
    var MenuGroup = React.createClass({
      getInitialState: function () {
        var entryGroup = this.props.group;
        var menuPath = this.props.menuPath;
        return {active: menuPath[0] == entryGroup.key};
      },
      handleClick: function (event) {
        var domNode = this.refs.groupLi;
        $(domNode).toggleClass("active");
      },
      render: function () {
        var groupClassName = "menu-group accordion-navigation ";
        var entryGroup = this.props.group;
        var menuPath = this.props.menuPath;
        var grpActive = this.state.active;
        groupClassName += grpActive ? " active" : "";
        var entryNodes = this.props.group.entries.map(function (entry) {
          return (<MenuEntry key={entry.key} entry={entry} menuPath={menuPath} groupActive={grpActive}/>);
        });
        var groupTitleCn = "fa " + entryGroup.icon;

        return (
          <li className={groupClassName} ref="groupLi">
            <div className="menu-group-title" onClick={this.handleClick}>
              <h5><i className={groupTitleCn}></i>{menutext[entryGroup.name]}</h5>
            </div>
            <div className="menu-group-content content">
              <ul>{entryNodes}</ul>
            </div>
          </li>
        );
      }
    });
    var Menu = React.createClass({
      render: function () {
        var menuPath = this.props.menuPath;
        var groupNodes = this.props.menuData.entries.map(function (group) {
          return (<MenuGroup key={group.key} group={group} menuPath={menuPath}/>);
        });
        return (<ul className="nav-menu accordion" data-accordion="">{groupNodes}</ul>);
      }
    });

    var BreadcrumbSeg = React.createClass({
      render: function () {
        var entry = this.props.seg;
        if (entry.manual) {
          return (<li>
            {a}
            <span >{entry.name}</span>
          </li>);
        }
        var a = (entry.url == "") ? <span >{menutext[entry.name]}</span> :
          <a href={entry.url}>{menutext[entry.name]}</a>;
        return (<li>{a}</li>);
      }
    });
    var Breadcrumb = React.createClass({
      entryRouting: function (menuPath, menuData) {
        menuPath = menuPath || this.props.menuPath;
        menuData = menuData || this.props.menuData;
        var current = menuData;
        var res = [];
        var i = 0;
        menuPath.forEach(function (node) {
          var match = _.find(current.entries, function (entry) {
            return entry.key == node;
          });
          if (match == null)return [];
          res[i++] = match;
          current = match;
        });
        var entityName = this.props.entityName;
        if (entityName) {
          var manualNode = {manual: true, name: entityName};
          res[i++] = manualNode;
        }
        return res;
      },
      render: function () {
        var menuPath = this.props.menuPath;
        var menuData = this.props.menuData;
        var routing = this.entryRouting(menuPath, menuData);
        var segNodes = routing.map(function (seg, i) {
          return (<BreadcrumbSeg key={i} seg={seg}/>);
        });
        return (
          <ol className="breadcrumb">{segNodes}</ol>);
      }
    });

    function renderMenu(menuData, menuPath, nav) {
      var datamap = require("datamap");
      menuData = menuData || datamap.data('menu');
      menuPath = menuPath || datamap.data('menuPath');
      ReactDOM.render(
        <Menu menuData={menuData} menuPath={menuPath}/>,
        nav
      );
    }

    function renderBreadcrumb(menuData, menuPath, div) {
      var datamap = require("datamap");
      menuData = menuData || datamap.data('menu');
      menuPath = menuPath || datamap.data('menuPath');
      var entityName = datamap.data('entityName');
      ReactDOM.render(
        <Breadcrumb menuData={menuData} menuPath={menuPath} entityName={entityName}/>,
        div
      );
    }

    return {
      renderMenu: renderMenu,
      renderBreadcrumb: renderBreadcrumb
    };
  });