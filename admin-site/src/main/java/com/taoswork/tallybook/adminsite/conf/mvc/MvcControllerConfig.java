package com.taoswork.tallybook.adminsite.conf.mvc;

import com.taoswork.tallybook.adminsite.web.controller.AdminLoginController;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * Created by Gao Yuan on 2015/5/14.
 */
@Configuration
@ComponentScan(basePackageClasses = {AdminLoginController.class} )
public class MvcControllerConfig {
}
