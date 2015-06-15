package com.taoswork.tallybook.adminsite.web.controller;

import com.taoswork.tallybook.admincore.menu.AdminMenuService;
import com.taoswork.tallybook.admincore.security.AdminSecurityService;
import com.taoswork.tallybook.business.dataservice.tallyadmin.TallyAdminDataService;
import com.taoswork.tallybook.general.solution.menu.Menu;
import com.taoswork.tallybook.general.solution.menu.MenuEntry;
import com.taoswork.tallybook.general.solution.menu.MenuEntryGroup;
import com.taoswork.tallybook.general.solution.web.control.BaseController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.annotation.Resource;

/**
 * Created by Gao Yuan on 2015/4/22.
 */
@Controller(AdminLoginController.CONTROLLER_NAME)
public class AdminLoginController extends BaseController {
    public static final String CONTROLLER_NAME = "AdminLoginController";

    @Resource(name = AdminSecurityService.COMPONENT_NAME)
    AdminSecurityService adminSecurityService;

    @Resource(name = TallyAdminDataService.COMPONENT_NAME)
    protected TallyAdminDataService tallyAdminDataService;

    @Resource(name = AdminMenuService.SERVICE_NAME)
    protected AdminMenuService adminNavigationService;

    // Entry URLs
    protected static String loginView = "login/login";
    protected static String forgotUsernameView = "login/forgotUsername";
    protected static String forgotPasswordView = "login/forgotPassword";
    protected static String changePasswordView  = "login/changePassword";
    protected static String resetPasswordView  = "login/resetPassword";

    @RequestMapping(value={"/login"}, method=RequestMethod.GET)
    public String baseLogin() {
        return loginView;
    }

    @RequestMapping(value = {"/", "/loginSuccess"}, method = RequestMethod.GET)
    public String loginSuccess(){
        Menu menu = adminNavigationService.buildMenu(adminSecurityService.getPersistentAdminEmployee());
        MenuEntryGroup firstGroup = menu.getFirstGroup();
        if(null != firstGroup){
            MenuEntry defaultEntry = firstGroup.getDefaultEntry();
            if(null != defaultEntry){
                return "redirect:" + defaultEntry.getUrl();
            }
        }
        return "noAccess";
    }

    @RequestMapping(value="/forgotUsername", method=RequestMethod.GET)
    public String forgotUsername() {
        return forgotUsernameView;
    }

    @RequestMapping(value="/forgotPassword", method=RequestMethod.GET)
    public String forgotPassword() {
        return forgotPasswordView;
    }

    @RequestMapping(value="/changePassword", method=RequestMethod.GET)
    public String changePassword() {
        return changePasswordView;
    }

    @RequestMapping(value="/resetPassword", method= RequestMethod.GET)
    public String resetPassword() {
        return resetPasswordView;
    }



}
