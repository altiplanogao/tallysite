package com.taoswork.tallybook.adminsite.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taoswork.tallybook.admincore.menu.AdminMenuService;
import com.taoswork.tallybook.admincore.security.AdminSecurityService;
import com.taoswork.tallybook.business.dataservice.tallyadmin.TallyAdminDataService;
import com.taoswork.tallybook.general.solution.menu.IMenu;
import com.taoswork.tallybook.general.solution.menu.IMenuEntry;
import com.taoswork.tallybook.general.web.control.BaseController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

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
    public String baseLogin(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader("loginpage", "true");
        return loginView;
    }

    @RequestMapping(value = {"/", "/loginSuccess"}, method = RequestMethod.GET)
    public String loginSuccess() {
        IMenu menu = adminNavigationService.buildMenu(adminSecurityService.getPersistentAdminEmployee());
        IMenuEntry firstGroup = menu.theFirstLeafEntry();
        if (null != firstGroup) {
            return "redirect:" + firstGroup.getUrl();
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


    @Override
    protected ObjectMapper getObjectMapper() {
        return null;
    }
}
