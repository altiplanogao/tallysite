package com.taoswork.tallybook.adminsite.conf.mvc;

import com.taoswork.tallybook.admincore.TallyBookAdminCoreRoot;
import com.taoswork.tallybook.general.extension.collections.MapBuilder;
import com.taoswork.tallybook.general.extension.collections.SetBuilder;
import com.taoswork.tallybook.general.solution.i18n.i18nMessageFileArranger;
import com.taoswork.tallybook.general.solution.web.view.thymeleaf.TallyBookDialect;
import com.taoswork.tallybook.general.solution.web.view.thymeleaf.TallyBookThymeleafViewResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.util.ResourceUtils;
import org.thymeleaf.dialect.IDialect;
import org.thymeleaf.messageresolver.IMessageResolver;
import org.thymeleaf.spring4.SpringTemplateEngine;
import org.thymeleaf.spring4.messageresolver.SpringMessageResolver;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.TemplateResolver;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Created by Gao Yuan on 2015/4/22.
 */
@Configuration
public class MvcViewConfigurer {
    private static final Logger LOGGER = LoggerFactory.getLogger(MvcViewConfigurer.class);

    protected static Set<TemplateResolver> templateResolverSet() {
        Set<TemplateResolver> resolvers = new HashSet<TemplateResolver>();
//        {
//            TemplateResolver resolver = (new TallyBookThymeleafServletContextTemplateResolver();
//            resolver.setPrefix("webcontent/admin_style/templates/");
//            resolver.setSuffix(".html");
//            resolver.setTemplateMode("HTML5");
//            resolver.setCharacterEncoding("UTF-8");
//
//            resolvers.add(resolver);
//        }
        {
            ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
            resolver.setPrefix("webcontent/admin_style/template/html/");
            resolver.setSuffix(".html");
            resolver.setTemplateMode("HTML5");
            resolver.setCharacterEncoding("UTF-8");
            resolver.setCacheable(true);

            resolvers.add(resolver);
        }
        return resolvers;
    }

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource ms = new ReloadableResourceBundleMessageSource();

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        List<String> basenameList = new ArrayList<String>();
        basenameList.add("classpath:/messages/OpenAdminGeneralMessages");
        basenameList.add("classpath:/messages/OpenAdminMessages");
        try {
            Resource[] resources = resolver.getResources(
                    //ResourceUtils.CLASSPATH_URL_PREFIX +
                    ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX +
                            "/entitymessages/*.properties");
            i18nMessageFileArranger arranger = new i18nMessageFileArranger();
            for (Resource res : resources) {
                try {
                    String respath = res.getFilename();
                    respath = "/entitymessages/" + respath;
                    arranger.add(respath);
                } catch (Exception e) {
                    LOGGER.error("Resource '{}' failed to return path.", res.getURI());
                    continue;
                }
            }
            for (String simplefilename : arranger.fileNamesWithoutLocalization()) {
                basenameList.add(ResourceUtils.CLASSPATH_URL_PREFIX + simplefilename);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        ms.setBasenames(basenameList.toArray(new String[]{}));
        return ms;
    }

    @Bean
    public SpringMessageResolver messageResolver() {
        SpringMessageResolver messageResolver = new SpringMessageResolver();
        return messageResolver;
    }

    private SpringMessageResolver messageResolverByBasenames(String[] basenames) {
        SpringMessageResolver messageResolver = new SpringMessageResolver();
        ReloadableResourceBundleMessageSource ms = new ReloadableResourceBundleMessageSource();
        ms.setBasenames(basenames);
        messageResolver.setMessageSource(ms);
        return messageResolver;
    }

    @Bean
    public SpringTemplateEngine thymeleafTemplateEngine() {
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
//        SpringMessageResolver messageResolver = new SpringMessageResolver();
//        messageResolver.setMessageSource(messageSource());
        templateEngine.setMessageResolvers(new SetBuilder<IMessageResolver>()
                .put(messageResolver())
                .put(messageResolverByBasenames(TallyBookAdminCoreRoot.getMessageBasenames()))
                .result());
        templateEngine.setTemplateResolvers(templateResolverSet());
        templateEngine.setAdditionalDialects(new SetBuilder<IDialect>()
                .put(new TallyBookDialect())
                .result());
        return templateEngine;
    }

    @Bean
    public TallyBookThymeleafViewResolver thymeleafViewResolver() {
        TallyBookThymeleafViewResolver viewResolver = new TallyBookThymeleafViewResolver();
        viewResolver.setTemplateEngine(thymeleafTemplateEngine());
        viewResolver.setCharacterEncoding("UTF-8");
        viewResolver.setDefaultLayout("layout/entityLayout");
        viewResolver.setLayoutMap(MapBuilder.instance("login/", "layout/loginLayout").result());
        return viewResolver;
    }
}
